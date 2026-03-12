import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
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

// Initialize Lambda client for async invocation
const lambdaClient = new LambdaClient({ region: "ap-south-1" });

// Timeout threshold for async job processing (20 seconds to allow time for 202 response before API Gateway timeout)
const TIMEOUT_THRESHOLD_MS = 20000; // 20 seconds

export const handler = async (event) => {
  try {
    // Check if this is an async continuation call
    if (event.asyncContinuation) {
      console.log('🔄 Async continuation call detected');
      return await handleAsyncContinuation(event);
    }
    
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
      enableTrace: true, // CRITICAL: Enable trace to get model output and extract shared payloads
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
        
        // Invoke this Lambda function asynchronously to continue processing
        const asyncPayload = {
          asyncContinuation: true,
          jobId: jobId,
          sessionId: sessionId,
          agentId: process.env.AGENT_ID,
          inputText: enhancedMessage
        };
        
        await lambdaClient.send(new InvokeCommand({
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          InvocationType: 'Event', // Async invocation
          Payload: JSON.stringify(asyncPayload)
        }));
        
        console.log('✅ Async Lambda invocation triggered');
        
        // Return 202 Accepted immediately
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
  let sharedPayloads = {}; // Store shared payloads by ID
  
  // Bedrock Agents stream their responses. We must loop through and decode the byte chunks.
  for await (const chunkEvent of response.completion) {
    // Removed verbose logging: console.log('📦 Chunk event type:', Object.keys(chunkEvent));
    
    // Handle regular chunk with bytes
    if (chunkEvent.chunk && chunkEvent.chunk.bytes) {
      const chunkText = new TextDecoder("utf-8").decode(chunkEvent.chunk.bytes);
      console.log('📝 Chunk text:', chunkText);
      agentReply += chunkText;
    }
    
    // Handle returnControl event (for action groups)
    if (chunkEvent.returnControl) {
      console.log('🔄 Return control event:', JSON.stringify(chunkEvent.returnControl));
    }
    
    // Handle trace events (for debugging and extracting shared payloads)
    if (chunkEvent.trace) {
      // Removed verbose logging: const traceStr = JSON.stringify(chunkEvent.trace);
      // Removed verbose logging: console.log('🔍 Trace event:', traceStr.length > 1000 ? traceStr.substring(0, 1000) + '...' : traceStr);
      
      // Extract shared payloads from trace
      if (chunkEvent.trace.orchestrationTrace) {
        const orchTrace = chunkEvent.trace.orchestrationTrace;
        
        // Check modelInvocationOutput for the actual response
        if (orchTrace.modelInvocationOutput) {
          const modelOutput = orchTrace.modelInvocationOutput;
          
          // Extract from rawResponse.content
          if (modelOutput.rawResponse && modelOutput.rawResponse.content) {
            console.log('🎯 Found model output in trace rawResponse.content');
            const content = modelOutput.rawResponse.content;
            
            // Content is usually an array of content blocks
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.text) {
                  console.log('📄 Found text in content block:', block.text.substring(0, 200));
                  // This is the actual JSON response before wrapping
                  agentReply = block.text;
                }
              }
            }
          }
          
          // Also check metadata for shared payloads
          if (modelOutput.metadata && modelOutput.metadata.usage) {
            console.log('📊 Token usage:', modelOutput.metadata.usage);
          }
        }
        
        // Check for observation with final response
        if (orchTrace.observation && orchTrace.observation.finalResponse) {
          const finalResp = orchTrace.observation.finalResponse;
          console.log('🎯 Found final response in observation:', JSON.stringify(finalResp).substring(0, 200));
          
          if (finalResp.text) {
            console.log('📄 Final response text:', finalResp.text.substring(0, 200));
            // Use this as the reply if we haven't found anything better
            if (!agentReply || agentReply.includes('<br:share_payload')) {
              agentReply = finalResp.text;
            }
          }
        }
      }
    }
  }
  
  console.log('🤖 Raw agent reply:', agentReply);
  
  // If reply still contains share_payload tag, it means we couldn't extract the actual content
  if (agentReply.includes('<br:share_payload')) {
    console.error('❌ Reply still contains share_payload tag - extraction failed');
    console.error('❌ This means the actual JSON content was not found in trace events');
  }
  
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
  
  // Helper function to extract nested JSON from reply field
  function extractNestedJson(parsedResponse) {
    let finalReply = parsedResponse.reply || "Response generated.";
    let finalTrials = parsedResponse.trials || [];
    let finalSuggestions = parsedResponse.suggestions || [];
    
    // If reply contains markdown code block with JSON, extract it
    if (typeof finalReply === 'string' && finalReply.includes('```json')) {
      console.log('⚠️ Reply field contains nested JSON markdown block - extracting...');
      const nestedStartIndex = finalReply.indexOf('{');
      const nestedEndIndex = finalReply.lastIndexOf('}');
      
      if (nestedStartIndex !== -1 && nestedEndIndex !== -1) {
        try {
          const nestedJson = finalReply.substring(nestedStartIndex, nestedEndIndex + 1);
          const nestedParsed = JSON.parse(nestedJson);
          console.log('✅ Successfully extracted nested JSON from reply field');
          
          // Use the nested values
          finalReply = nestedParsed.reply || finalReply;
          finalTrials = nestedParsed.trials || finalTrials;
          finalSuggestions = nestedParsed.suggestions || finalSuggestions;
        } catch (nestedError) {
          console.log('⚠️ Failed to parse nested JSON, using original reply');
        }
      }
    }
    
    return {
      sessionId: sessionId,
      reply: finalReply,
      trials: finalTrials,
      suggestions: finalSuggestions,
      ui_form: parsedResponse.ui_form || undefined,
      fit_score_provisional: parsedResponse.fit_score_provisional || undefined,
      final_assessment: parsedResponse.final_assessment || undefined
    };
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
    
    // 3. Extract nested JSON if present and return
    return extractNestedJson(parsedResponse);
  } catch (parseError) {
    console.log('⚠️ Failed to parse extracted JSON:', parseError);
    console.log('⚠️ Attempting with sanitized version...');
    
    // Try with sanitized version as fallback
    try {
      const sanitizedReply = cleanedReply.replace(/[\n\r\t]/g, ' ');
      parsedResponse = JSON.parse(sanitizedReply);
      console.log('✅ Successfully parsed sanitized JSON');
      console.log('📋 Parsed suggestions:', parsedResponse.suggestions);
      
      return extractNestedJson(parsedResponse);
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
        
        return extractNestedJson(parsedResponse);
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

// Async continuation handler
async function handleAsyncContinuation(event) {
  const { jobId, sessionId, agentId, inputText } = event;
  
  console.log(`🔄 Processing async continuation for job: ${jobId}`);
  
  try {
    // Build the InvokeAgentCommand
    const command = new InvokeAgentCommand({
      agentId: agentId,
      agentAliasId: "TSTALIASID",
      sessionId: sessionId,
      inputText: inputText,
      enableTrace: true, // CRITICAL: Enable trace to get model output and extract shared payloads
    });
    
    // Invoke the agent
    const agentReply = await invokeAgent(client, command);
    
    // Process the reply
    const result = await processAgentReply(agentReply, sessionId);
    
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
    
    console.log(`✅ Async job ${jobId} completed and saved to DynamoDB`);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
    
  } catch (error) {
    console.error(`❌ Async continuation failed for job ${jobId}:`, error);
    
    // Update DynamoDB with error status
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
    
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}
