# Deploy Lambda Fix for Action Group

## What Changed
Updated `clinicaltrialgov-api-lambda` to properly handle Bedrock Action Group requests with OpenAPI schema format.

### Key Changes:
1. **Response Format**: Changed from "Function Details" format to "OpenAPI" format
2. **apiPath Handling**: Now extracts and returns the `apiPath` from the request (fixes the error)
3. **Response Structure**: Returns `responseBody.application/json.body` instead of `functionResponse`
4. **Additional Parameters**: Added support for `location` and `age` parameters

## Files Created
1. `lambda-functions/clinicaltrialgov-api-lambda/src/index.mjs` - Fixed Lambda code
2. `terraform/clinicaltrialgov-api-lambda.tf` - Terraform configuration

## Deployment Steps

### Step 1: Import Existing Lambda into Terraform State
```bash
cd trial-scout-frontend/BankEnd/terraform

# Import the Lambda function
terraform import aws_lambda_function.clinicaltrialgov_api clinicaltrialgov-api-lambda

echo "Lambda imported successfully"
```

### Step 2: Apply Terraform Changes
```bash
# Review changes
terraform plan

# Apply (this will update the Lambda code)
terraform apply

# Confirm with 'yes' when prompted
```

This will:
- Update the Lambda function code with the fixed version
- Maintain all existing configurations (IAM role, timeout, memory, etc.)
- Keep the existing CloudWatch log group

### Step 3: Verify Lambda Update
```bash
# Check Lambda function details
aws lambda get-function --function-name clinicaltrialgov-api-lambda --region ap-south-1 --query 'Configuration.{LastModified:LastModified,CodeSize:CodeSize,Runtime:Runtime}' --output table

# Check recent logs
aws logs tail /aws/lambda/clinicaltrialgov-api-lambda --follow --region ap-south-1
```

### Step 4: Test Lambda Directly
Create a test event file:
```bash
cat > test-bedrock-event.json << 'EOF'
{
  "messageVersion": "1.0",
  "agent": {
    "name": "TrialScout_ClinicalSpecialist",
    "id": "KUGTRXKVYO",
    "alias": "prod",
    "version": "1"
  },
  "sessionId": "test-session-123",
  "apiPath": "/searchClinicalTrials",
  "httpMethod": "POST",
  "requestBody": {
    "content": {
      "application/json": {
        "properties": [
          {
            "name": "condition",
            "type": "string",
            "value": "diabetes"
          },
          {
            "name": "location",
            "type": "string",
            "value": "United States"
          },
          {
            "name": "age",
            "type": "integer",
            "value": "24"
          },
          {
            "name": "status",
            "type": "string",
            "value": "RECRUITING"
          },
          {
            "name": "pageSize",
            "type": "integer",
            "value": "5"
          }
        ]
      }
    }
  }
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name clinicaltrialgov-api-lambda \
  --payload file://test-bedrock-event.json \
  --region ap-south-1 \
  response.json

# View response
cat response.json | jq .
```

### Expected Response:
```json
{
  "messageVersion": "1.0",
  "response": {
    "apiPath": "/searchClinicalTrials",
    "httpMethod": "POST",
    "httpStatusCode": 200,
    "responseBody": {
      "application/json": {
        "body": "{\"trials\":[{\"nct_id\":\"NCT...\",\"trial_name\":\"...\",\"status\":\"RECRUITING\",\"summary\":\"...\",\"location\":\"...\"}],\"count\":5}"
      }
    }
  }
}
```

### Step 5: Test via Bedrock Agent
After Lambda is deployed, test the Clinical Specialist agent in the AWS Console:

1. Go to Bedrock Agents → TrialScout_ClinicalSpecialist
2. Click "Test" in Agent Builder
3. Enter: "I am 24, from USA. Find clinical trials for diabetes"
4. Verify the agent:
   - Gathers parameters
   - Invokes the Action Group
   - Returns trials in JSON format

### Step 6: Test via Supervisor Agent
Test the full multi-agent flow:

1. Go to Bedrock Agents → TrialScout_Supervisor
2. Click "Test" in Agent Builder
3. Enter: "I am 24, from USA. Find clinical trials for diabetes"
4. Verify:
   - Supervisor routes to Clinical Specialist
   - Clinical Specialist invokes Action Group
   - Lambda returns trials
   - Supervisor passes JSON through to user

## Troubleshooting

### If Import Fails
The Lambda might already be in Terraform state. Check with:
```bash
terraform state list | grep clinicaltrialgov
```

If it exists, skip the import step and go directly to `terraform apply`.

### If Lambda Update Fails
Check IAM permissions for the Terraform execution role:
```bash
aws sts get-caller-identity
```

Ensure the user/role has `lambda:UpdateFunctionCode` permission.

### If Action Group Still Fails
1. Check CloudWatch logs:
   ```bash
   aws logs tail /aws/lambda/clinicaltrialgov-api-lambda --follow --region ap-south-1
   ```

2. Verify Lambda permission for Bedrock:
   ```bash
   aws lambda get-policy --function-name clinicaltrialgov-api-lambda --region ap-south-1
   ```

3. Re-prepare the Clinical Specialist agent:
   ```bash
   aws bedrock-agent prepare-agent --agent-id KUGTRXKVYO --region ap-south-1
   ```

### If Trials Don't Return
1. Test ClinicalTrials.gov API directly:
   ```bash
   curl "https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&filter.overallStatus=RECRUITING&pageSize=5" -H "accept: application/json"
   ```

2. Check if the API is accessible from Lambda (VPC/network issues)

## Verification Checklist
- [ ] Lambda imported into Terraform state
- [ ] Terraform apply completed successfully
- [ ] Direct Lambda test returns correct format with `apiPath: "/searchClinicalTrials"`
- [ ] Clinical Specialist agent test succeeds
- [ ] Supervisor agent test succeeds and routes correctly
- [ ] Trials are returned in JSON format
- [ ] No "APIPath mismatch" errors

## Rollback Plan
If issues occur, revert to previous Lambda code:
```bash
# Get previous version
aws lambda list-versions-by-function --function-name clinicaltrialgov-api-lambda --region ap-south-1

# Revert to previous version (replace $VERSION)
aws lambda update-function-configuration \
  --function-name clinicaltrialgov-api-lambda \
  --region ap-south-1 \
  --description "Reverted to previous version"
```

---

**Status**: Ready for deployment
**Priority**: HIGH - Fixes Action Group invocation error
**Estimated Time**: 5-10 minutes
