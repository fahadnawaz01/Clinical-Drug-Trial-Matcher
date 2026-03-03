# Context Poller Lambda - Deployment Guide

## Step 1: Deploy Infrastructure with Terraform

```bash
cd trial-scout-frontend/BankEnd/terraform

# Initialize Terraform (if not already done)
terraform init

# Plan the changes
terraform plan

# Apply the changes
terraform apply
```

This will create:
- Lambda function: `TrialScout_ContextPoller`
- IAM role with DynamoDB GetItem permission
- API Gateway endpoint: `GET /context-status`
- CloudWatch log group

## Step 2: Package and Deploy Lambda Code

Since the Lambda uses only AWS SDK (built into Node.js 22 runtime), we don't need node_modules.

### Option A: Deploy via AWS Console (Simplest)

1. Go to Lambda console: https://ap-south-1.console.aws.amazon.com/lambda/home?region=ap-south-1#/functions/TrialScout_ContextPoller

2. Click **Code** tab

3. Create the folder structure:
   - Create folder: `src`
   - Upload `index.mjs` into the `src` folder

4. Click **Deploy**

### Option B: Deploy via AWS CLI

```bash
cd trial-scout-frontend/BankEnd/lambda-functions/context-poller

# Create deployment package (no node_modules needed)
zip -r function.zip src/ package.json

# Deploy
aws lambda update-function-code \
    --function-name TrialScout_ContextPoller \
    --zip-file fileb://function.zip \
    --region ap-south-1
```

## Step 3: Test the Endpoint

Get the API Gateway URL from Terraform output:

```bash
terraform output context_status_endpoint_url
```

Test with curl:

```bash
# Replace with your actual API URL and test values
curl "https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/context-status?sessionId=test-session&expectedFileName=test.pdf"
```

Expected responses:
- `{"status": "processing"}` - Document not yet processed or fileName doesn't match
- `{"status": "complete", "profile": {...}}` - Document processed and fileName matches

## API Endpoint Details

**URL**: `GET /context-status`

**Query Parameters**:
- `sessionId` (required): The session ID
- `expectedFileName` (required): The exact filename to check for

**Response**:
```json
{
  "status": "processing"
}
```

or

```json
{
  "status": "complete",
  "profile": {
    "demographics": {...},
    "diagnoses": [...],
    "medications": [...],
    "allergies": [...],
    "vitalSigns": {...}
  }
}
```

## Troubleshooting

Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/TrialScout_ContextPoller --follow --region ap-south-1
```
