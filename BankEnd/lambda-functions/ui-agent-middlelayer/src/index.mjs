import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Initialize the Bedrock client in the Mumbai region
const client = new BedrockAgentRuntimeClient({ region: "ap-south-1" });

// Initialize DynamoDB client with removeUndefinedValues option
const ddbClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    removeUndefinedValues: true // Remove undefined values before saving to DynamoDB
  }
});

// Timeout threshold for async job processing (27-28 seconds)
const TIMEOUT_THRESHOLD_MS = 27000; // 27 seconds

export const handler = async (event) => {
  try {
    // Parse the incoming request 
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event;
    
    // Extract the user's message (e.g., asking about trial criteria)
    const userMessage = body.inputText; 
    
    if (!userMessage) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Missing inputText" }) 
      };
    }
    
    // SINGLE-BRAIN STATE SYSTEM:
    // - sessionId: Current conversation thread (for both DynamoDB profile and Bedrock Agent session)
    // - memoryId: REMOVED - was causing token accumulation even with memory disabled
    const sessionId = body.sessionId || `session-${Date.now()}`;
    const preferredLanguage = body.preferredLanguage || 'en';
    
    // Log the IDs for debugging
    console.log('🆔 SessionId:', sessionId);
    console.log('🌐 Preferred Language:', preferredLanguage);
    
    // SPLIT-BRAIN PROMPT INJECTION:
    // Inject language instruction into the user's message
    // CRITICAL: Always inject language instruction to override agent memory
    const languageInstruction = preferredLanguage === 'en'
      ? `\n\n[SYSTEM INSTRUCTION: The user's preferred language is English. You MUST reply in English. Always return your response in the JSON format: {"reply": "your message in English", "trials": [array of trials in English], "suggestions": [array of suggestion strings in English]}]\n\n`
      : `\n\n[SYSTEM INSTRUCTION: The user's preferred language is ${preferredLanguage}. You MUST reply to the "reply" field in your JSON response natively in ${preferredLanguage}. However, you MUST keep the "trials" array data (trial_name, summary, nct_id, status) in standard English. Your internal reasoning and the parameters you extract to query the ClinicalTrials.gov database must strictly remain in standard English. Always return your response in the same JSON format: {"reply": "your message in ${preferredLanguage}", "trials": [array of trials in English], "suggestions": [array of suggestion strings in ${preferredLanguage}]}]\n\n`;
    
    const enhancedMessage = languageInstruction + userMessage;
    
    // Build the InvokeAgentCommand - DO NOT include memoryId
    const commandParams = {
      agentId: process.env.AGENT_ID,
      agentAliasId: "TSTALIASID",
      sessionId: sessionId,
      inputText: enhancedMessage,
    };
    
    console.log('📤 Invoking agent WITHOUT memoryId to avoid token accumulation');
    
    const command = new InvokeAgentCommand(commandParams);
    
    // ============================================
    // ASYNC JOB PROCESSING: Promise.race() Logic
    // ============================================
    
    // Create a timeout promise that rejects after TIMEOUT_THRESHOLD_MS
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), TIMEOUT_THRESHOLD_MS);
    });
    
    // Create the agent invocation promise
    const agentPromise = invokeAgent(client, command);
    
    try {
      // Race between agent response and timeout
      const agentReply = await Promise.race([agentPromise, timeoutPromise]);
      
      // ✅ FAST PATH: Agent responded before timeout
      console.log('✅ Agent responded within timeout threshold');
      const parsedResult = await processAgentReply(agentReply, sessionId);
      
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedResult)
      };
      
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        // ⏰ SLOW PATH: Timeout reached, switch to async job processing
        console.log('⏰ Timeout threshold reached, switching to async job processing');
        
        // Generate a unique job ID
        const jobId = randomUUID();
        
        // Write initial job entry to DynamoDB
        const ttl = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
        await docClient.send(new PutCommand({
          TableName: 'TrialFitResults',
          Item: {
            jobId: jobId,
            status: 'PROCESSING',
            result: {},
            ttl: ttl
          }
        }));
        
        console.log(`📝 Created async job: ${jobId}`);
        
        // Continue processing in the background (don't await)
        processAgentInBackground(agentPromise, jobId).catch(err => {
          console.error('❌ Background processing error:', err);
        });
        
        // Return 202 Accepted with jobId
        return {
          statusCode: 202,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: jobId,
            status: 'PROCESSING',
            message: 'Complex analysis in progress. Please poll for results.'
          })
        };
      } else {
        // Other errors
        throw error;
      }
    }
    
  } catch (error) {
    console.error("Failed to connect to Bedrock Agent:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Internal server error connecting to the agent.",
        details: error.message 
      })
    };
  }
};

// Helper function to invoke the agent and collect the response
async function invokeAgent(client, command) {
  const response = await client.send(command);
  let agentReply = "";
  
  // Bedrock Agents stream their responses. We must loop through and decode the byte chunks.
  for await (const chunkEvent of response.completion) {
    if (chunkEvent.chunk && chunkEvent.chunk.bytes) {
      const chunkText = new TextDecoder("utf-8").decode(chunkEvent.chunk.bytes);
      agentReply += chunkText;
    }
  }
  
  console.log('🤖 Raw agent reply:', agentReply);
  return agentReply;
}

// Helper function to process agent reply and return structured response
async function processAgentReply(agentReply, sessionId) {
  let parsedResponse;
  let cleanedReply = agentReply.trim();
  
  // 1. AGGRESSIVE JSON EXTRACTION
  // Bedrock often wraps JSON in markdown blocks like ```json ... ```
  // We isolate the JSON by extracting everything from the first { to the last }
  const startIndex = cleanedReply.indexOf('{');
  const endIndex = cleanedReply.lastIndexOf('}');
  
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    cleanedReply = cleanedReply.substring(startIndex, endIndex + 1);
    console.log('✅ Extracted JSON block from markdown');
  } else {
    console.log('⚠️ No JSON braces found in response');
  }
  
  try {
    // 2. Parse the cleanly extracted JSON string
    // CRITICAL FIX: Don't sanitize newlines - they might be inside string values
    // Instead, parse the raw extracted JSON directly
    parsedResponse = JSON.parse(cleanedReply);
    console.log('✅ Successfully parsed agent reply as JSON');
    console.log('📋 Parsed suggestions:', parsedResponse.suggestions);
    console.log('📋 Parsed ui_form:', parsedResponse.ui_form);
    console.log('📋 Parsed fit_score_provisional:', parsedResponse.fit_score_provisional);
    console.log('📋 Parsed final_assessment:', parsedResponse.final_assessment);
    
    // 3. Return the parsed JSON
    return {
      sessionId: sessionId,
      reply: parsedResponse.reply || "Response generated.",
      trials: parsedResponse.trials || [],
      suggestions: parsedResponse.suggestions || [],
      ui_form: parsedResponse.ui_form || undefined,
      fit_score_provisional: parsedResponse.fit_score_provisional || undefined,
      final_assessment: parsedResponse.final_assessment || undefined
    };
  } catch (parseError) {
    console.log('⚠️ Failed to parse extracted JSON:', parseError);
    console.log('⚠️ Attempting with sanitized version...');
    
    // Try with sanitized version as fallback
    try {
      const sanitizedReply = cleanedReply.replace(/[\n\r\t]/g, ' ');
      parsedResponse = JSON.parse(sanitizedReply);
      console.log('✅ Successfully parsed sanitized JSON');
      console.log('📋 Parsed suggestions:', parsedResponse.suggestions);
      
      return {
        sessionId: sessionId,
        reply: parsedResponse.reply || "Response generated.",
        trials: parsedResponse.trials || [],
        suggestions: parsedResponse.suggestions || [],
        ui_form: parsedResponse.ui_form || undefined,
        fit_score_provisional: parsedResponse.fit_score_provisional || undefined,
        final_assessment: parsedResponse.final_assessment || undefined
      };
    } catch (sanitizeError) {
      console.log('⚠️ Sanitized parsing also failed:', sanitizeError);
    }
    
    // Try to extract JSON from text using regex as a secondary fallback
    const jsonMatch = agentReply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        // Sanitize the fallback match as well
        const sanitizedFallback = jsonMatch[0].replace(/[\n\r\t]/g, ' ');
        parsedResponse = JSON.parse(sanitizedFallback);
        console.log('✅ Extracted and parsed JSON from agent reply using regex:', parsedResponse);
        
        return {
          sessionId: sessionId,
          reply: parsedResponse.reply || "Response generated.",
          trials: parsedResponse.trials || [],
          suggestions: parsedResponse.suggestions || [],
          ui_form: parsedResponse.ui_form || undefined,
          fit_score_provisional: parsedResponse.fit_score_provisional || undefined,
          final_assessment: parsedResponse.final_assessment || undefined
        };
      } catch (extractError) {
        console.log('❌ Failed to parse extracted JSON');
      }
    }
    
    // Fallback: Parse plain text response and convert to JSON
    console.log('⚠️ Agent returned plain text, converting to JSON format...');
    const trials = parseTrialsFromText(agentReply);
    
    if (trials.length > 0) {
      console.log(`✅ Extracted ${trials.length} trials from plain text`);
      return {
        sessionId: sessionId,
        reply: `Found ${trials.length} clinical trial${trials.length > 1 ? 's' : ''} for your condition`,
        trials: trials,
        suggestions: []
      };
    }
    
    // No trials found, return as plain text reply
    console.log('⚠️ No trials found in text, returning as plain text reply');
    return {
      sessionId: sessionId,
      reply: agentReply,
      trials: [],
      suggestions: []
    };
  }
}

// Background processing function
async function processAgentInBackground(agentPromise, jobId) {
  try {
    console.log(`🔄 Background processing started for job: ${jobId}`);
    
    // Wait for the agent to complete
    const agentReply = await agentPromise;
    
    // Process the reply
    const result = await processAgentReply(agentReply, null);
    
    // Update DynamoDB with the completed result
    const ttl = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    await docClient.send(new UpdateCommand({
      TableName: 'TrialFitResults',
      Key: { jobId: jobId },
      UpdateExpression: 'SET #status = :status, #result = :result, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#result': 'result',
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':status': 'COMPLETED',
        ':result': result,
        ':ttl': ttl
      }
    }));
    
    console.log(`✅ Job ${jobId} completed and saved to DynamoDB`);
  } catch (error) {
    console.error(`❌ Background processing failed for job ${jobId}:`, error);
    
    // Update DynamoDB with error status
    try {
      await docClient.send(new UpdateCommand({
        TableName: 'TrialFitResults',
        Key: { jobId: jobId },
        UpdateExpression: 'SET #status = :status, #result = :result',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#result': 'result'
        },
        ExpressionAttributeValues: {
          ':status': 'FAILED',
          ':result': { error: error.message }
        }
      }));
    } catch (updateError) {
      console.error(`❌ Failed to update error status for job ${jobId}:`, updateError);
    }
  }
}
// Helper function to parse trials from plain text response
function parseTrialsFromText(text) {
  const trials = [];
  
  // Pattern to match trial entries in the format:
  // 1. **Title** - NCT ID: NCT12345 - Status: RECRUITING - Summary: Description
  const trialPattern = /\d+\.\s+\*\*(.+?)\*\*\s*-\s*NCT ID:\s*(NCT\d+)\s*-\s*Status:\s*(\w+)\s*-\s*Summary:\s*(.+?)(?=\d+\.\s+\*\*|$)/gs;
  
  let match;
  while ((match = trialPattern.exec(text)) !== null) {
    trials.push({
      trial_name: match[1].trim(),
      nct_id: match[2].trim(),
      status: match[3].trim(),
      summary: match[4].trim()
    });
  }
  
  return trials;
}
