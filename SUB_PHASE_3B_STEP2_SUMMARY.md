# Sub-Phase 3B - Step 2: Node.js API Lambda Update ✅

## What Was Implemented

Updated the `ui-agent-middlelayer` Lambda function to support the Dual-Brain state system by extracting and passing `memoryId` to AWS Bedrock Agent Runtime.

### Code Changes

#### Key Updates in `index.mjs`:

1. **Extract memoryId from Request**
   ```javascript
   const sessionId = body.sessionId || `session-${Date.now()}`;
   const memoryId = body.memoryId || null;
   ```

2. **Conditional memoryId Parameter**
   ```javascript
   const commandParams = {
     agentId: process.env.AGENT_ID,
     agentAliasId: "TSTALIASID",
     sessionId: sessionId,
     inputText: userMessage,
   };
   
   // Add memoryId if provided (enables Bedrock Agent Memory)
   if (memoryId) {
     commandParams.memoryId = memoryId;
     console.log('✅ Bedrock Agent Memory enabled with memoryId:', memoryId);
   }
   ```

3. **Enhanced Logging**
   - Logs both `sessionId` and `memoryId` for debugging
   - Indicates whether Agent Memory is enabled

4. **Updated Response**
   ```javascript
   return {
     statusCode: 200,
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       sessionId: sessionId,
       memoryId: memoryId,  // NEW: Return memoryId to frontend
       reply: agentReply
     })
   };
   ```

### Deployment

✅ Lambda deployed via Terraform
✅ Memory increased: 128MB → 256MB
✅ Timeout increased: 20s → 60s
✅ CloudWatch log retention: 7 days
✅ Tags added for organization

### How It Works

**Request Flow:**
1. React frontend sends:
   ```json
   {
     "inputText": "Find trials for diabetes",
     "sessionId": "uuid-conversation-thread",
     "memoryId": "uuid-patient-identity"
   }
   ```

2. Lambda extracts both IDs:
   - `sessionId` → Used for conversation threading
   - `memoryId` → Passed to Bedrock Agent Runtime

3. Bedrock Agent Runtime:
   - Uses `memoryId` to maintain long-term conversational memory
   - Remembers patient context across multiple sessions
   - Provides personalized responses based on memory

4. Lambda returns:
   ```json
   {
     "sessionId": "uuid-conversation-thread",
     "memoryId": "uuid-patient-identity",
     "reply": "AI agent response"
   }
   ```

### Console Logs

When the Lambda runs, you'll see:
```
🆔 SessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🧠 MemoryId: f9e8d7c6-b5a4-3210-9876-543210fedcba
✅ Bedrock Agent Memory enabled with memoryId: f9e8d7c6-b5a4-3210-9876-543210fedcba
```

Or if no memoryId provided:
```
🆔 SessionId: a1b2c3d4-e5f6-7890-abcd-ef1234567890
🧠 MemoryId: null
⚠️ No memoryId provided - Agent Memory not enabled
```

### Backward Compatibility

The Lambda is backward compatible:
- If `memoryId` is not provided, it works without Agent Memory
- Existing API calls without `memoryId` will continue to function
- No breaking changes to the API contract

### Testing

To test the Lambda:

1. **Via AWS Console:**
   - Go to Lambda → ui-agent-middlelayer → Test
   - Use this test event:
   ```json
   {
     "body": "{\"inputText\":\"Find trials for diabetes\",\"sessionId\":\"test-session-123\",\"memoryId\":\"test-memory-456\"}"
   }
   ```

2. **Via React Frontend:**
   - Open the app and send a chat message
   - Check browser Network tab for the request payload
   - Check Lambda CloudWatch logs for the console output

### Next Steps

**Step 3** will provide instructions for:
- Enabling Memory on the Bedrock Agent via AWS Console
- Configuring memory duration settings
- Testing the complete Dual-Brain system

**STOP GENERATING - Awaiting approval for Step 3**
