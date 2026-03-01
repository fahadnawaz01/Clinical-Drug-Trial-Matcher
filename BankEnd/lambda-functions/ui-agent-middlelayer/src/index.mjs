import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

// Initialize the client in the Mumbai region
const client = new BedrockAgentRuntimeClient({ region: "ap-south-1" });

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
    
    // DUAL-BRAIN STATE SYSTEM:
    // - sessionId: Current conversation thread (for DynamoDB profile data)
    // - memoryId: Long-term patient identity (for Bedrock Agent Memory)
    const sessionId = body.sessionId || `session-${Date.now()}`;
    const memoryId = body.memoryId || null;
    
    // Log the IDs for debugging
    console.log('🆔 SessionId:', sessionId);
    console.log('🧠 MemoryId:', memoryId);
    
    // Build the InvokeAgentCommand with memoryId for native conversational memory
    const commandParams = {
      agentId: process.env.AGENT_ID,           // Set this in Lambda Environment Variables
      agentAliasId: "TSTALIASID",              // Targets your working draft
      sessionId: sessionId,
      inputText: userMessage,
    };
    
    // Add memoryId if provided (enables Bedrock Agent Memory)
    if (memoryId) {
      commandParams.memoryId = memoryId;
      console.log('✅ Bedrock Agent Memory enabled with memoryId:', memoryId);
    } else {
      console.log('⚠️ No memoryId provided - Agent Memory not enabled');
    }
    
    const command = new InvokeAgentCommand(commandParams);
    
    // Send the payload to the agent
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
    
    // Try to parse the agent reply as JSON (Haiku 4.5 should return JSON)
    let parsedResponse;
    try {
      // First, try to parse the entire reply as JSON
      parsedResponse = JSON.parse(agentReply);
      console.log('✅ Successfully parsed agent reply as JSON:', parsedResponse);
      
      // Return the parsed JSON with sessionId and memoryId
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          memoryId: memoryId,
          ...parsedResponse  // Spread the parsed JSON (reply, trials, etc.)
        })
      };
    } catch (parseError) {
      console.log('⚠️ Agent reply is not valid JSON, trying to extract JSON...');
      
      // Try to extract JSON from text (in case agent added extra text)
      const jsonMatch = agentReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('✅ Extracted and parsed JSON from agent reply:', parsedResponse);
          
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sessionId,
              memoryId: memoryId,
              ...parsedResponse
            })
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
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionId,
            memoryId: memoryId,
            reply: `Found ${trials.length} clinical trial${trials.length > 1 ? 's' : ''} for your condition`,
            trials: trials
          })
        };
      }
      
      // No trials found, return as plain text reply
      console.log('⚠️ No trials found in text, returning as plain text reply');
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          memoryId: memoryId,
          reply: agentReply
        })
      };
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
