# Sub-Phase 3A Testing Guide

## Overview
Sub-Phase 3A: The Dual-Context Anchor is now complete. This phase anchors patient medical profiles in DynamoDB while maintaining conversational memory on the frontend.

## What Was Implemented

### Step 1: DynamoDB Table ✅
- Table: `TrialScout_PatientProfiles`
- Partition Key: `sessionId` (String)
- Billing: PAY_PER_REQUEST (zero cost when idle)
- TTL: 90 days auto-expiration
- Encryption: Enabled

### Step 2: Lambda Function ✅
- Function: `update-patient-profile`
- Runtime: Node.js 20.x
- Accepts: `{ sessionId, profileData }`
- Returns: Success confirmation with timestamp
- Permissions: DynamoDB PutItem, GetItem, UpdateItem

### Step 3: API Gateway Integration ✅
- Endpoint: `https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/update-profile`
- Method: POST
- CORS: Enabled for React frontend
- Integration: Lambda Proxy (AWS_PROXY)

### Step 4: React Frontend Integration ✅
- **Session Manager**: Generates persistent UUID v4 `sessionId` stored in localStorage
- **Patient Profile**: Sends profile data to backend on save
- **Chat Interface**: Includes `sessionId` in all API calls (ready for future AI agent use)
- **Chat History**: Already persists in localStorage (implemented in earlier phase)

## Testing Instructions

### 1. Test Session ID Generation
```bash
# Open browser console on React app
localStorage.getItem('trialScout_sessionId')
# Should return a UUID like: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

### 2. Test Patient Profile Save
1. Navigate to `/profile` page
2. Click "Edit" button
3. Fill in patient information:
   - Name: Test Patient
   - Age: 45
   - Sex: Male
   - Location: Mumbai, India
   - Add conditions: Diabetes, Hypertension
   - Add medications: Metformin, Lisinopril
4. Click "Save Changes"
5. Should see: "✓ Profile saved successfully"
6. Check browser console for: "✅ Profile saved to backend"

### 3. Test Backend (DynamoDB)
```bash
# Query DynamoDB to verify data was saved
aws dynamodb get-item \
  --table-name TrialScout_PatientProfiles \
  --key '{"sessionId": {"S": "YOUR_SESSION_ID_HERE"}}' \
  --region ap-south-1
```

### 4. Test Chat with Session ID
1. Navigate to `/chat` page
2. Send a message: "Find trials for diabetes"
3. Check browser Network tab → Request payload should include:
   ```json
   {
     "inputText": "Find trials for diabetes",
     "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   }
   ```

### 5. Test Chat History Persistence
1. Send a few messages in chat
2. Navigate to `/profile` page
3. Navigate back to `/chat` page
4. Chat history should still be visible (persisted in localStorage)

## API Request Format

### Update Profile Endpoint
```bash
curl -X POST https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/update-profile \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "profileData": {
      "name": "Test Patient",
      "age": "45",
      "sex": "Male",
      "location": "Mumbai, India",
      "conditions": ["Diabetes", "Hypertension"],
      "medications": ["Metformin", "Lisinopril"]
    }
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Patient profile saved successfully",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "updatedAt": "2026-02-28T10:30:45.123Z"
}
```

## Error Handling

### Frontend Behavior
- If backend save fails: Shows error message but still saves locally
- If network error: Shows user-friendly error message
- Save button disabled during save operation

### Backend Validation
- Missing `sessionId`: Returns 400 error
- Invalid `profileData`: Returns 400 error
- DynamoDB error: Returns 500 error with details

## Cost Estimate
- DynamoDB: $0.00 (PAY_PER_REQUEST, minimal usage)
- Lambda: $0.00 (free tier covers 1M requests/month)
- API Gateway: $0.00 (free tier covers 1M requests/month)
- **Total: $0.00/month** for hackathon usage

## Next Steps (Sub-Phase 3B)
The next sub-phase will update the Bedrock AI agent to:
1. Receive `sessionId` from frontend
2. Query DynamoDB to fetch patient profile
3. Use profile context in AI responses
4. Provide personalized trial recommendations

## Files Modified
- `trial-scout-frontend/frontend/src/utils/sessionManager.ts` (new)
- `trial-scout-frontend/frontend/src/pages/PatientProfile.tsx` (updated)
- `trial-scout-frontend/frontend/src/pages/ChatInterface.tsx` (updated)
- `trial-scout-frontend/frontend/src/styles/PatientProfile.css` (updated)
- `trial-scout-frontend/BankEnd/terraform/update-profile-api-gateway.tf` (new)
- `trial-scout-frontend/BankEnd/terraform/update-profile-lambda.tf` (new)
- `trial-scout-frontend/BankEnd/terraform/dynamodb-patient-profiles.tf` (new)
- `trial-scout-frontend/BankEnd/lambda-functions/update-patient-profile/src/index.js` (new)
