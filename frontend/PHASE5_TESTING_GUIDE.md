# Phase 5 Sub-Phase B - Testing Guide

## Quick Start Testing

### Prerequisites
1. Backend deployed (Lambda functions + API Gateway)
2. Frontend running (`npm run dev`)
3. Test PDF file ready

---

## Test Scenarios

### 1. Happy Path Test ✅

**Steps**:
1. Open the chat interface
2. Click the paperclip icon (📎) in the chat input
3. Select a PDF file (< 10MB)
4. Observe the flow:
   - ✅ System message: "📄 Document received: filename.pdf. Analyzing..."
   - ✅ Loading spinner appears
   - ✅ "Cancel Processing" button appears in header
   - ✅ Input field disabled
   - ✅ After 10-30 seconds, AI responds with trial matches
   - ✅ Loading spinner disappears
   - ✅ Cancel button disappears

**Expected Result**: Seamless experience, AI provides trial matches based on document

---

### 2. Timeout Test ⏱️

**Steps**:
1. Upload a file
2. Wait for 2 minutes (40 polls × 3 seconds)

**Expected Result**:
- Polling stops automatically
- Error message: "⚠️ Document processing is taking longer than expected..."
- Loading state clears
- Can upload again

---

### 3. Network Error Test 🌐

**Steps**:
1. Start file upload
2. Immediately disconnect internet
3. Wait for 3 failed poll attempts (~9 seconds)

**Expected Result**:
- Polling stops after 3 retries
- Error message: "❌ Unable to check processing status..."
- Loading state clears
- Reconnect internet and can try again

---

### 4. User Cancellation Test 🚫

**Steps**:
1. Upload a file
2. Click "Cancel Processing" button while polling

**Expected Result**:
- Polling stops immediately
- Message: "Document processing cancelled. You can upload again when ready."
- Loading state clears
- Can upload new file

---

### 5. Invalid File Type Test 📄

**Steps**:
1. Click paperclip icon
2. Try to select .txt or .doc file

**Expected Result**:
- Alert: "Please upload a PDF, JPEG, or PNG file."
- No upload occurs

---

### 6. File Too Large Test 📦

**Steps**:
1. Click paperclip icon
2. Select file > 10MB

**Expected Result**:
- Alert: "File size exceeds 10 MB limit. Your file is X.XX MB."
- No upload occurs

---

## Debugging

### Check Polling Status
Open browser console and look for:
```
🔄 Starting polling for file: filename.pdf
📊 Poll attempt 1/40
📥 Polling response: { status: 'processing' }
📊 Poll attempt 2/40
...
✅ Document processing complete!
🤖 Triggering AI agent with hidden prompt
```

### Check API Endpoint
Manually test the polling endpoint:
```bash
curl "https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/context-status?sessionId=test-session&expectedFileName=test.pdf"
```

Expected responses:
- `{"status":"processing"}` - Still processing
- `{"status":"complete","profile":{...}}` - Done
- `{"status":"error","error":"..."}` - Failed

### Check Lambda Logs
```bash
# Context Poller logs
aws logs tail /aws/lambda/TrialScout_ContextPoller --follow --region ap-south-1

# Document Processor logs
aws logs tail /aws/lambda/TrialScout_DocProcessor --follow --region ap-south-1
```

---

## Common Issues

### Issue: Polling never completes
**Cause**: Document processor Lambda failed
**Solution**: Check CloudWatch logs for TrialScout_DocProcessor

### Issue: "Missing Authentication Token" error
**Cause**: API Gateway route not deployed
**Solution**: Wait 2-3 minutes for API Gateway propagation, or redeploy

### Issue: File uploads but no polling starts
**Cause**: Frontend not calling startPolling
**Solution**: Check browser console for errors

### Issue: Polling stops immediately
**Cause**: Network error or backend error
**Solution**: Check browser console and Lambda logs

---

## Performance Metrics

### Expected Timings:
- **File Upload**: 1-3 seconds (depends on file size)
- **Document Processing**: 10-30 seconds (Textract + Bedrock)
- **Polling Interval**: 3 seconds
- **Total Time**: ~15-35 seconds from upload to AI response

### Polling Statistics:
- **Average polls needed**: 5-10 (15-30 seconds)
- **Maximum polls**: 40 (2 minutes timeout)
- **Network retry tolerance**: 3 consecutive failures

---

## Success Criteria

✅ File upload works smoothly
✅ System message appears immediately
✅ Loading state activates
✅ Polling starts automatically
✅ Cancel button appears and works
✅ Timeout protection works (2 minutes)
✅ Network error handling works (3 retries)
✅ AI receives hidden prompt with profile
✅ AI responds with trial matches
✅ Loading state clears after AI response
✅ User can upload multiple files sequentially
✅ No memory leaks (polling clears on unmount)

---

## API Endpoints Reference

### Presigned URL (File Upload)
```
POST /presigned-url
Body: {
  "fileName": "test.pdf",
  "fileType": "application/pdf",
  "fileSize": 12345,
  "sessionId": "abc123"
}
```

### Context Status (Polling)
```
GET /context-status?sessionId={id}&expectedFileName={name}
Response: {
  "status": "processing" | "complete" | "error",
  "profile": {...},  // only if complete
  "error": "..."     // only if error
}
```

### UI Agent (AI Chat)
```
POST /chat
Body: {
  "inputText": "System: The user just uploaded...",
  "sessionId": "abc123",
  "memoryId": "xyz789"
}
```
