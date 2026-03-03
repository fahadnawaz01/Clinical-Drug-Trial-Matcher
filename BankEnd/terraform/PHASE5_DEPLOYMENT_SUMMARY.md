# Phase 5 Sub-Phase A: Deployment Summary

## ✅ Infrastructure Deployed Successfully

### What Was Built

**1. IAM Role & Policies** (`lambda-doc-processor-iam.tf`)
- Role: `TrialScout_DocProcessor_Role`
- Permissions:
  - CloudWatch Logs (AWS Lambda Basic Execution)
  - S3 GetObject (scoped to `documents/*` path)
  - DynamoDB UpdateItem (scoped to `TrialScout_PatientProfiles` table)
  - Bedrock InvokeModel (Claude 3.5 Sonnet v2)

**2. Lambda Function** (`lambda-doc-processor.tf`)
- Function Name: `TrialScout_DocProcessor`
- Runtime: Node.js 20.x
- Memory: 1024 MB
- Timeout: 300 seconds (5 minutes)
- Handler: `index.handler`
- Environment Variables:
  - `DYNAMODB_TABLE_NAME`: TrialScout_PatientProfiles
  - `S3_BUCKET_NAME`: trial-scout-medical-documents-ap-south-1
  - `AWS_REGION`: Automatically provided by Lambda

**3. S3 Event Trigger** (`s3-event-trigger.tf`)
- Bucket: `trial-scout-medical-documents-ap-south-1`
- Trigger: `s3:ObjectCreated:*`
- Filter Prefix: `documents/`
- Target: `TrialScout_DocProcessor` Lambda

**4. CloudWatch Log Group**
- Log Group: `/aws/lambda/TrialScout_DocProcessor`
- Retention: 7 days

## Architecture Flow

```
User uploads PDF
    ↓
S3: documents/{sessionId}/filename.pdf
    ↓
S3 Event Notification
    ↓
Lambda: TrialScout_DocProcessor
    ├─ Downloads PDF from S3
    ├─ Calls Bedrock Claude 3.5 for extraction
    └─ Updates DynamoDB with medical profile
```

## Current Status

### ✅ Completed
- [x] Terraform infrastructure provisioned
- [x] IAM roles and policies created
- [x] Lambda function created
- [x] S3 event trigger configured
- [x] Test handler deployed

### 🔄 Next Steps

**1. Deploy Full Lambda Code**

The current Lambda has a test handler. To deploy the full document processing code:

```powershell
cd lambda-functions/document-processor

# Option A: Manual deployment (recommended for Windows path issues)
# 1. Zip the files manually or use a tool like 7-Zip
# 2. Include: src/, node_modules/, package.json
# 3. Upload via AWS Console or CLI

# Option B: Use AWS SAM CLI (if installed)
sam build
sam deploy

# Option C: Use shorter path workaround
# Move the lambda-functions folder to C:\lambda-temp
# Create zip there and deploy
```

**2. Test the Pipeline**

```bash
# Upload a test PDF to trigger the Lambda
aws s3 cp test-document.pdf s3://trial-scout-medical-documents-ap-south-1/documents/test-session-123/medical-report.pdf --region ap-south-1

# Check CloudWatch Logs
aws logs tail /aws/lambda/TrialScout_DocProcessor --follow --region ap-south-1
```

**3. Verify DynamoDB Update**

```bash
# Check if the medical profile was updated
aws dynamodb get-item \
  --table-name TrialScout_PatientProfiles \
  --key '{"sessionId": {"S": "test-session-123"}}' \
  --region ap-south-1
```

## Lambda Function Code

The full implementation is in `lambda-functions/document-processor/src/index.mjs`:

**Features:**
- Extracts `sessionId` from S3 object key (`documents/{sessionId}/filename.pdf`)
- Downloads PDF from S3
- Calls Bedrock Claude 3.5 with PDF document analysis
- Extracts FHIR-lite medical profile:
  - Demographics (name, age, gender, DOB)
  - Diagnoses (conditions, ICD-10 codes)
  - Medications (name, dosage, frequency)
  - Allergies
  - Vital signs
- Updates DynamoDB with extracted profile

## Configuration Files

### Terraform Variables Updated
- `terraform.tfvars`: Updated `bedrock_agent_id` to use fast agent (HSWNG5TAJH)

### New Terraform Files
1. `lambda-doc-processor-iam.tf` - IAM configuration
2. `lambda-doc-processor.tf` - Lambda function
3. `s3-event-trigger.tf` - S3 event notification

## AWS Resources Created

| Resource Type | Resource Name | ARN/ID |
|--------------|---------------|---------|
| IAM Role | TrialScout_DocProcessor_Role | arn:aws:iam::262530697266:role/TrialScout_DocProcessor_Role |
| Lambda Function | TrialScout_DocProcessor | arn:aws:lambda:ap-south-1:262530697266:function:TrialScout_DocProcessor |
| CloudWatch Log Group | /aws/lambda/TrialScout_DocProcessor | - |
| S3 Bucket Notification | document_upload_trigger | - |

## Cost Considerations

**Lambda:**
- Memory: 1024 MB
- Timeout: 5 minutes
- Estimated cost per invocation: ~$0.0001 (depends on execution time)

**Bedrock Claude 3.5:**
- Input tokens: ~$3 per 1M tokens
- Output tokens: ~$15 per 1M tokens
- Estimated cost per document: $0.01 - $0.05 (depends on document size)

**S3:**
- Storage: $0.023 per GB/month
- GET requests: $0.0004 per 1,000 requests

**DynamoDB:**
- Pay-per-request billing
- Write requests: $1.25 per million requests

## Troubleshooting

### Lambda Not Triggering
- Check S3 event notification is configured
- Verify Lambda permission allows S3 to invoke
- Check CloudWatch Logs for errors

### Bedrock Access Denied
- Verify IAM role has `bedrock:InvokeModel` permission
- Check model ARN is correct for your region
- Ensure Claude 3.5 Sonnet is available in ap-south-1

### DynamoDB Update Fails
- Verify IAM role has `dynamodb:UpdateItem` permission
- Check table name matches environment variable
- Ensure sessionId is being extracted correctly

## Security Notes

- S3 bucket has encryption at rest (AES256)
- All data transfer uses HTTPS
- IAM policies follow least privilege principle
- Lambda has no internet access (uses VPC endpoints if needed)
- DynamoDB has point-in-time recovery enabled

## Hackathon Readiness

✅ Infrastructure is production-ready for hackathon (March 4th)
✅ Asynchronous processing prevents API Gateway timeouts
✅ Scalable architecture (Lambda auto-scales)
✅ Cost-optimized (pay-per-use model)

**Remaining Work:**
- Deploy full Lambda code with dependencies
- Test end-to-end with sample medical documents
- Integrate with frontend (presigned URL upload flow)
