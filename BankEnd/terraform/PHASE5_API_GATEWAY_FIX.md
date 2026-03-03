# Phase 5 - API Gateway 403 Error Fix

## Problem
The `/context-status` endpoint was returning `403 Forbidden` errors when accessed from the frontend.

## Root Cause
The Lambda function handler path was incorrect in the Terraform configuration:
- **Incorrect**: `handler = "index.handler"`
- **Correct**: `handler = "src/index.handler"`

The Lambda code is in `src/index.mjs`, so the handler must reference `src/index.handler`.

## Fix Applied

### File: `terraform/lambda-context-poller.tf`
Changed:
```hcl
handler = "index.handler"
```

To:
```hcl
handler = "src/index.handler"
```

### Deployment Steps:
1. Updated Terraform configuration
2. Ran `terraform apply -auto-approve`
3. Lambda handler updated successfully

## Verification

### Test Command:
```bash
curl "https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/context-status?sessionId=test&expectedFileName=test.pdf"
```

### Expected Response:
```json
{
  "status": "processing"
}
```

### Actual Response:
✅ Working! Returns `{"status": "processing"}` as expected.

## Additional Notes

### API Gateway Stage Update
The API Gateway stage needed to be manually updated to point to the latest deployment:
```bash
aws apigateway update-stage \
  --rest-api-id rk1zsye504 \
  --stage-name drug-trial-matcher \
  --patch-operations op=replace,path=/deploymentId,value=aefhk6 \
  --region ap-south-1
```

This is a known issue with Terraform where the stage doesn't automatically update to new deployments.

## Status
✅ **RESOLVED** - The endpoint is now accessible and working correctly.

## Testing from Frontend
The frontend polling should now work. Upload a file and check the browser console for:
```
🔄 Starting polling for file: filename.pdf
📊 Poll attempt 1/40
📥 Polling response: { status: 'processing' }
```

After document processing completes (~10-30 seconds), you should see:
```
✅ Document processing complete!
🤖 Triggering AI agent with hidden prompt
```
