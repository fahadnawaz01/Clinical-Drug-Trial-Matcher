# Sub-Phase 3B - Step 1: React Frontend Memory Keys ✅

## What Was Implemented

### Dual-Brain State System
We now have TWO persistent identifiers:

1. **sessionId** (Existing)
   - Represents: Current conversation thread
   - Used for: DynamoDB patient profile data
   - Lifecycle: Can be cleared to start a new conversation
   - Storage Key: `trialScout_sessionId`

2. **memoryId** (NEW)
   - Represents: Long-term patient identity
   - Used for: Bedrock Agent Memory (conversational context)
   - Lifecycle: Persists across multiple conversation threads
   - Storage Key: `trialScout_memoryId`

### Files Modified

#### 1. `sessionManager.ts`
- Added `getMemoryId()` function to generate/retrieve memoryId
- Added `clearMemoryId()` function (with warning about erasing Bedrock memory)
- Added `clearAllSessionData()` to clear both IDs
- Updated `getSessionInfo()` to return both IDs
- Now uses `uuid` library for proper UUID v4 generation

#### 2. `ChatInterface.tsx`
- Imports both `getSessionId()` and `getMemoryId()`
- Initializes both IDs on component mount
- Sends BOTH IDs in the POST request to chat API:
  ```json
  {
    "inputText": "user query",
    "sessionId": "uuid-for-conversation-thread",
    "memoryId": "uuid-for-patient-identity"
  }
  ```

## How It Works

### On First Page Load
1. User opens the app
2. `getSessionId()` generates UUID v4 → stored in localStorage
3. `getMemoryId()` generates UUID v4 → stored in localStorage
4. Both IDs persist across page refreshes

### On Chat Message
1. User sends a message
2. Frontend includes both `sessionId` and `memoryId` in API call
3. Backend will use:
   - `sessionId` → Query DynamoDB for profile data
   - `memoryId` → Pass to Bedrock Agent for conversational memory

### Console Output
When you open the app, you'll see:
```
🆔 New sessionId generated: a1b2c3d4-...
🧠 New memoryId generated: e5f6g7h8-...
```

Or if IDs already exist:
```
🆔 Existing sessionId retrieved: a1b2c3d4-...
🧠 Existing memoryId retrieved: e5f6g7h8-...
```

## Testing

### Check localStorage
Open browser console and run:
```javascript
localStorage.getItem('trialScout_sessionId')
localStorage.getItem('trialScout_memoryId')
```

### Check API Payload
1. Open Network tab (F12 → Network)
2. Send a chat message
3. Look at the request payload - should include both IDs:
```json
{
  "inputText": "Find trials for diabetes",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "memoryId": "f9e8d7c6-b5a4-3210-9876-543210fedcba"
}
```

## Next Steps

**Step 2** will update the Node.js Lambda function to:
- Extract `memoryId` from the request
- Pass it to Bedrock Agent Runtime API
- Enable native conversational memory

**STOP GENERATING - Awaiting approval for Step 2**
