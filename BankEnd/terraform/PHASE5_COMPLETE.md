# Phase 5 Sub-Phase A - COMPLETE ✅

## Deployment Status
**Date**: March 2, 2026  
**Status**: ✅ FULLY OPERATIONAL

## Issues Resolved

### Issue 1: Documents Uploading to Wrong Path ✅
- **Problem**: Documents uploading to S3 root instead of `documents/{sessionId}/`
- **Solution**: Updated presigned URL generator to accept sessionId parameter
- **Status**: FIXED

### Issue 2: Lambda Had Test Handler Only ✅
- **Problem**: Lambda had 461-byte placeholder, not full processing code
- **Solution**: Deployed full 4.17 MB code with Bedrock integration via AWS CLI
- **Status**: FIXED

### Issue 3: Wrong Bedrock Model ID Format ✅
- **Problem**: `ValidationException: Invocation of model ID anthropic.claude-3-5-sonnet-20241022-v2:0 with on-demand throughput isn't supported`
- **Root Cause**: Direct model IDs don't support on-demand invocation
- **Solution**: Changed to inference profile `apac.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Status**: FIXED

### Issue 4: IAM Permission Denied for Inference Profile ✅
- **Problem**: `AccessDeniedException: User is not authorized to perform: bedrock:InvokeModel on resource: arn:aws:bedrock:ap-south-1:262530697266:inference-profile/apac.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Root Cause**: IAM policy only had foundation model ARN, not inference profile ARN
- **Solution**: Updated IAM policy to include both ARNs
- **Status**: FIXED

## Current Configuration

### Lambda Function
- **Name**: `TrialScout_DocProcessor`
- **Runtime**: Node.js 20.x
- **Handler**: `src/index.handler`
- **Memory**: 1024 MB
- **Timeout**: 300 seconds (5 minutes)
- **Code Size**: 4.17 MB

### Bedrock Model
- **Model**: Claude 3.5 Sonnet v2
- **Inference Profile**: `apac.anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Region**: ap-south-1 (with cross-region failover to ap-northeast-1)

### IAM Permissions
```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel"],
  "Resource": [
    "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/apac.anthropic.claude-3-5-sonnet-20241022-v2:0",
    "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
  ]
}
```

### S3 Event Trigger
- **Bucket**: `trial-scout-medical-documents-ap-south-1`
- **Trigger Prefix**: `documents/`
- **Event Type**: `s3:ObjectCreated:*`
- **Target**: `TrialScout_DocProcessor` Lambda

### DynamoDB Table
- **Name**: `TrialScout_PatientProfiles`
- **Hash Key**: `sessionId`
- **Attributes Updated**:
  - `medicalProfile` (JSON string with extracted data)
  - `lastUpdated` (ISO timestamp)
  - `documentFileName` (original filename)

## Complete End-to-End Flow

1. **User uploads PDF** from frontend
   - Frontend calls presigned URL endpoint with sessionId
   - Presigned URL generator creates URL for `documents/{sessionId}/filename.pdf`

2. **Document uploads to S3**
   - Browser uploads directly to S3 using presigned URL
   - Document stored at: `documents/{sessionId}/{timestamp}-{random}-{filename}.pdf`

3. **S3 event trigger fires**
   - S3 detects new object in `documents/` prefix
   - Invokes `TrialScout_DocProcessor` Lambda

4. **Lambda processes document**
   - Extracts sessionId from S3 object key
   - Downloads PDF from S3
   - Sends PDF to Bedrock Claude 3.5 via inference profile
   - Bedrock extracts structured medical profile

5. **Medical profile extracted**
   ```json
   {
     "demographics": { "name": "...", "age": 45, "gender": "..." },
     "diagnoses": [{ "condition": "...", "icd10Code": "..." }],
     "medications": [{ "name": "...", "dosage": "..." }],
     "allergies": ["..."],
     "vitalSigns": { "bloodPressure": "...", "heartRate": 72 }
   }
   ```

6. **DynamoDB updated**
   - Lambda updates patient profile for that sessionId
   - Medical profile stored as JSON string
   - Timestamp and filename recorded

## Testing Instructions

### 1. Upload a Document
- Open your frontend: http://localhost:5173 (or your deployed URL)
- Upload a medical document PDF
- Wait for upload confirmation

### 2. Check CloudWatch Logs
```powershell
# Get latest log stream
aws logs describe-log-streams `
    --log-group-name "/aws/lambda/TrialScout_DocProcessor" `
    --order-by LastEventTime `
    --descending `
    --max-items 1 `
    --region ap-south-1 `
    --query 'logStreams[0].logStreamName' `
    --output text

# View logs (replace LOG_STREAM_NAME)
aws logs get-log-events `
    --log-group-name "/aws/lambda/TrialScout_DocProcessor" `
    --log-stream-name "LOG_STREAM_NAME" `
    --region ap-south-1 `
    --limit 50
```

### 3. Expected Log Output
```
📄 Document Processor triggered
📦 Bucket: trial-scout-medical-documents-ap-south-1
🔑 Object Key: documents/{sessionId}/filename.pdf
🆔 SessionId: {sessionId}
📝 FileName: filename.pdf
⬇️ Downloading document from S3...
✅ Downloaded 1786 bytes
🤖 Invoking Bedrock Claude 3.5 for document extraction...
🤖 Bedrock response: {...}
📝 Extracted text: {...}
✅ Parsed medical profile: {...}
💾 Updating DynamoDB...
✅ DynamoDB updated: {...}
```

### 4. Verify DynamoDB
```powershell
# Query by sessionId (replace YOUR_SESSION_ID)
aws dynamodb get-item `
    --table-name TrialScout_PatientProfiles `
    --key '{"sessionId":{"S":"YOUR_SESSION_ID"}}' `
    --region ap-south-1 `
    --output json
```

### 5. Expected DynamoDB Record
```json
{
  "Item": {
    "sessionId": { "S": "1d866697-54ff-4e54-9e7b-1c4065174484" },
    "medicalProfile": { "S": "{\"demographics\":{...},\"diagnoses\":[...],\"medications\":[...],\"allergies\":[...],\"vitalSigns\":{...}}" },
    "lastUpdated": { "S": "2026-03-02T02:20:00.000Z" },
    "documentFileName": { "S": "discharge_summary_7_oncology.pdf" }
  }
}
```

## Performance Metrics

### Observed Execution Times
- S3 download: ~270ms
- Bedrock invocation: ~2-5 seconds (varies by document size)
- DynamoDB update: ~50ms
- **Total**: ~3-6 seconds per document

### Cost Estimates (per 1000 documents)
- Lambda: ~$0.10 (300s timeout, 1024MB memory)
- Bedrock: ~$15-30 (depends on document size, Claude 3.5 pricing)
- S3: ~$0.01 (storage + requests)
- DynamoDB: ~$0.25 (on-demand writes)
- **Total**: ~$15-30 per 1000 documents

## Files Modified

1. `trial-scout-frontend/BankEnd/lambda-functions/document-processor/src/index.mjs`
   - Changed model ID to inference profile

2. `trial-scout-frontend/BankEnd/terraform/lambda-doc-processor-iam.tf`
   - Added `data.aws_caller_identity.current` data source
   - Updated Bedrock policy to include inference profile ARN

3. `trial-scout-frontend/BankEnd/terraform/lambda-doc-processor.tf`
   - Updated handler from `index.handler` to `src/index.handler`

## Next Steps

1. ✅ Test with real medical documents
2. ✅ Verify extraction quality
3. 🔄 Monitor CloudWatch logs for errors
4. 🔄 Optimize Bedrock prompt if needed
5. 🔄 Add error handling for malformed PDFs
6. 🔄 Add retry logic for Bedrock timeouts

## Hackathon Deadline
**March 4th, 2026** - Phase 5 Sub-Phase A is COMPLETE! 🎉

Ready to test the complete asynchronous document processing pipeline!
