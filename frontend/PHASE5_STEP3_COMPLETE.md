# Phase 5 - Sub-Phase B: Step 3 Complete ✅

## The React Polling Loop & UI Illusion

### Implementation Summary:

This step implements a robust polling mechanism with comprehensive failure handling to check document processing status and seamlessly trigger AI agent interaction.

---

## 1. Backend Enhancement

### Context Poller Lambda Update
**File**: `BankEnd/lambda-functions/context-poller/src/index.mjs`

**Added Error Status Handling**:
```javascript
// Check for processing errors
if (item.processingError) {
  return {
    status: 'error',
    error: item.processingError
  };
}
```

**Response Types**:
- `{ status: 'processing' }` - Document still being processed
- `{ status: 'complete', profile: {...} }` - Processing complete with medical profile
- `{ status: 'error', error: 'message' }` - Processing failed

---

## 2. Frontend Polling Implementation

### Polling Configuration
**File**: `frontend/src/pages/ChatInterface.tsx`

**Constants**:
```typescript
const MAX_POLL_ATTEMPTS = 40;      // 2 minutes total
const POLL_INTERVAL = 3000;        // 3 seconds between polls
const MAX_NETWORK_RETRIES = 3;     // Network failure tolerance
```

### State Management
```typescript
const [isPolling, setIsPolling] = useState(false);
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
const pollAttemptsRef = useRef(0);
const networkRetriesRef = useRef(0);
const currentFileNameRef = useRef<string>('');
```

---

## 3. Polling Flow

### Start Polling
Triggered when file upload completes:
```typescript
const startPolling = (fileName: string) => {
  // Reset counters
  pollAttemptsRef.current = 0;
  networkRetriesRef.current = 0;
  setIsPolling(true);
  
  // Poll every 3 seconds
  pollingIntervalRef.current = setInterval(async () => {
    // Check timeout
    // Make API request
    // Handle response
  }, POLL_INTERVAL);
};
```

### Polling Logic
Every 3 seconds:
1. **Increment attempt counter**
2. **Check timeout** (40 attempts = 2 minutes)
3. **Make API request** to `/context-status?sessionId={id}&expectedFileName={name}`
4. **Handle response**:
   - `status: 'complete'` → Stop polling, trigger AI agent
   - `status: 'error'` → Stop polling, show error
   - `status: 'processing'` → Continue polling
5. **Handle network errors** (retry up to 3 times)

### Stop Polling
```typescript
const stopPolling = () => {
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = null;
  }
  setIsPolling(false);
  pollAttemptsRef.current = 0;
  networkRetriesRef.current = 0;
};
```

---

## 4. Failure Safeguards

### ✅ Timeout Protection
- **Maximum Duration**: 2 minutes (40 polls × 3 seconds)
- **Action**: Stop polling, show timeout message
- **Message**: "Document processing is taking longer than expected. Please try uploading again."

### ✅ Network Error Handling
- **Maximum Retries**: 3 consecutive failures
- **Action**: Stop polling, show connection error
- **Message**: "Unable to check processing status. Please check your internet connection."

### ✅ Backend Error Status
- **Detection**: Lambda returns `{ status: 'error' }`
- **Action**: Stop polling immediately, show error
- **Message**: "Document processing failed: {error}. Please try uploading again."

### ✅ User Cancellation
- **UI**: "Cancel Processing" button appears during polling
- **Action**: User can manually stop polling
- **Message**: "Document processing cancelled. You can upload again when ready."

### ✅ Component Cleanup
- **useEffect cleanup**: Clears interval on unmount
- **Prevents**: Memory leaks and orphaned intervals

---

## 5. UI Illusion Flow

### Complete User Experience:

1. **User clicks paperclip** → File picker opens
2. **User selects file** → Upload starts
3. **Upload completes** → System message appears:
   ```
   📄 Document received: filename.pdf. Analyzing your clinical history...
   ```
4. **Loading state activates** → Spinner shows, input disabled
5. **Polling starts** → Every 3 seconds, check status
6. **Cancel button appears** → User can abort if needed
7. **Processing completes** → Polling stops
8. **Hidden prompt triggers** → AI agent receives:
   ```
   System: The user just uploaded a new medical document. 
   The patient's updated clinical profile is:
   
   {medical profile JSON}
   
   Acknowledge this and search for relevant clinical trials 
   based on their medical conditions.
   ```
9. **AI responds** → Loading state remains until AI finishes
10. **AI message appears** → Loading state clears, user sees response

### Critical: Loading State Persistence
- Loading state activates on file upload
- Remains active during polling
- Remains active during AI agent call
- Only clears when AI agent responds
- Creates seamless "synchronous" illusion

---

## 6. Hidden System Message

### Implementation
```typescript
const handleSendMessage = async (
  text: string, 
  isHiddenSystemMessage: boolean = false
) => {
  // Skip adding user message for hidden system messages
  if (!isHiddenSystemMessage) {
    addUserMessage(text);
  }
  
  // Continue with API call...
};
```

### Usage
```typescript
// When polling completes
const hiddenPrompt = `System: The user just uploaded a new medical document...`;
await handleSendMessage(hiddenPrompt, true); // true = hidden
```

---

## 7. Cancel Button UI

### Visual Design
- **Color**: Orange/amber (#f59e0b)
- **Animation**: Pulsing border to draw attention
- **Position**: Header, next to "Clear Chat" button
- **Icon**: Circle with X (cancel symbol)

### Behavior
- Only visible when `isPolling === true`
- Clicking stops polling immediately
- Shows cancellation message
- Clears loading state

---

## 8. Error Messages

### Timeout (2 minutes)
```
⚠️ Document processing is taking longer than expected. 
Please try uploading again or contact support if the issue persists.
```

### Network Failure (3 retries)
```
❌ Unable to check processing status. 
Please check your internet connection and try again.
```

### Backend Error
```
❌ Document processing failed: {error message}. 
Please try uploading again.
```

### User Cancellation
```
Document processing cancelled. You can upload again when ready.
```

---

## 9. Files Modified

### Backend:
- ✅ `BankEnd/lambda-functions/context-poller/src/index.mjs`
  - Added error status handling
  - Returns `{ status: 'error', error: '...' }` on processing failure

### Frontend:
- ✅ `frontend/src/pages/ChatInterface.tsx`
  - Added polling state management
  - Implemented `startPolling()` function
  - Implemented `stopPolling()` function
  - Updated `handleFileUpload()` to start polling
  - Updated `handleSendMessage()` to support hidden messages
  - Added cancel button UI
  - Added cleanup effect

- ✅ `frontend/src/styles/ChatInterface.css`
  - Added `.chat-interface__cancel-btn` styles
  - Added `.chat-interface__cancel-icon` styles
  - Added `pulse-border` animation
  - Updated header layout for multiple buttons

---

## 10. Testing Checklist

### Happy Path:
- [ ] Upload PDF file
- [ ] See "Document received" message
- [ ] Loading spinner appears
- [ ] Cancel button appears
- [ ] After ~10-30 seconds, AI responds with trial matches
- [ ] Loading spinner disappears
- [ ] Cancel button disappears

### Timeout Scenario:
- [ ] Upload file
- [ ] Wait 2 minutes
- [ ] See timeout error message
- [ ] Loading state clears
- [ ] Can upload again

### Network Error Scenario:
- [ ] Disconnect internet
- [ ] Upload file
- [ ] After 3 failed polls, see network error
- [ ] Loading state clears

### User Cancellation:
- [ ] Upload file
- [ ] Click "Cancel Processing" button
- [ ] See cancellation message
- [ ] Loading state clears
- [ ] Can upload again

### Backend Error:
- [ ] Simulate processing error in Lambda
- [ ] Upload file
- [ ] See error message from backend
- [ ] Loading state clears

---

## 11. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                          │
│                    Click Paperclip Icon                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     File Upload to S3                       │
│              documents/{sessionId}/filename.pdf             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  S3 Trigger → Doc Processor                 │
│           Lambda extracts medical profile to DynamoDB       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Polling Loop                    │
│         GET /context-status every 3 seconds (max 40)        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Safeguards:                                          │  │
│  │ • Max 40 attempts (2 minutes)                        │  │
│  │ • Max 3 network retries                              │  │
│  │ • User cancel button                                 │  │
│  │ • Component cleanup on unmount                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Status Check: documentFileName?                │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ processing  │  │  complete   │  │    error    │        │
│  │ Continue... │  │  Stop Poll  │  │  Stop Poll  │        │
│  └─────────────┘  └──────┬──────┘  └──────┬──────┘        │
└───────────────────────────┼─────────────────┼──────────────┘
                            │                 │
                            ▼                 ▼
              ┌─────────────────────┐  ┌──────────────┐
              │  Hidden AI Prompt   │  │ Show Error   │
              │  with Profile JSON  │  │   Message    │
              └──────────┬──────────┘  └──────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   AI Agent Call     │
              │  (Loading persists) │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   AI Response with  │
              │   Trial Matches     │
              │ (Loading clears)    │
              └─────────────────────┘
```

---

## Phase 5 Sub-Phase B: COMPLETE ✅

All three steps have been successfully implemented:
- ✅ Step 1: Polling API (Lambda + API Gateway)
- ✅ Step 2: Paperclip UI & File Upload
- ✅ Step 3: Polling Loop & UI Illusion

The system now provides a seamless, synchronous-feeling experience for asynchronous document processing with comprehensive failure handling and user control.
