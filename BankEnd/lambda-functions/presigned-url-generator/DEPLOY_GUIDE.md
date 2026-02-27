# Deployment Guide: Pre-signed URL Generator Lambda

## Step-by-Step Deployment

### Step 1: Deploy Lambda Infrastructure (Terraform)

```bash
cd trial-scout-frontend/BankEnd/terraform

# Initialize (if needed)
terraform init

# Review changes
terraform plan

# Deploy
terraform apply
```

**Expected Output:**
```
Apply complete! Resources: 4 added, 0 changed, 0 destroyed.

Outputs:
presigned_url_lambda_arn = "arn:aws:lambda:ap-south-1:262530697266:function:presigned-url-generator"
presigned_url_lambda_name = "presigned-url-generator"
```

### Step 2: Deploy Lambda Code

```bash
cd ../lambda-functions/presigned-url-generator

# Install dependencies
npm install --production

# Deploy (Windows)
deploy.bat

# Deploy (Linux/Mac)
chmod +x deploy.sh
./deploy.sh
```

### Step 3: Test the Lambda Function

#### Test in AWS Console

1. Go to AWS Lambda Console
2. Open `presigned-url-generator` function
3. Click "Test" tab
4. Create new test event:

```json
{
  "body": "{\"fileName\":\"test-document.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":1024000}"
}
```

5. Click "Test"

**Expected Response:**
```json
{
  "statusCode": 200,
  "headers": {...},
  "body": "{\"success\":true,\"uploadUrl\":\"https://...\",\"fileKey\":\"uploads/...\",\"expiresIn\":300}"
}
```

#### Test with AWS CLI

```bash
aws lambda invoke \
  --function-name presigned-url-generator \
  --region ap-south-1 \
  --payload '{"body":"{\"fileName\":\"test.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":1024}"}' \
  response.json

cat response.json
```

### Step 4: Create API Gateway Endpoint

You have two options:

#### Option A: Manual (AWS Console)

1. Go to API Gateway Console
2. Open your existing API: `Drug-Trial-matches`
3. Create new resource: `/presigned-url`
4. Create POST method
5. Integration type: Lambda Function
6. Select: `presigned-url-generator`
7. Enable CORS
8. Deploy to stage: `drug-trial-matcher`

#### Option B: Terraform (Recommended)

Create `api-gateway-presigned-url.tf`:

```hcl
# Get existing API Gateway
data "aws_api_gateway_rest_api" "existing" {
  name = "Drug-Trial-matches"
}

# Create /presigned-url resource
resource "aws_api_gateway_resource" "presigned_url" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  parent_id   = data.aws_api_gateway_rest_api.existing.root_resource_id
  path_part   = "presigned-url"
}

# POST method
resource "aws_api_gateway_method" "presigned_url_post" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "POST"
  authorization = "NONE"
}

# Lambda integration
resource "aws_api_gateway_integration" "presigned_url_lambda" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presigned_url_generator.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presigned_url_generator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.existing.execution_arn}/*/*"
}

# Enable CORS
resource "aws_api_gateway_method" "presigned_url_options" {
  rest_api_id   = data.aws_api_gateway_rest_api.existing.id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "presigned_url_options" {
  rest_api_id = data.aws_api_gateway_rest_api.existing.id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_options.http_method
  type        = "MOCK"
}
```

Then:
```bash
terraform apply
```

### Step 5: Test API Gateway Endpoint

```bash
curl -X POST https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher/presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "medical-report.pdf",
    "fileType": "application/pdf",
    "fileSize": 2048576
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "uploadUrl": "https://trial-scout-medical-documents-ap-south-1.s3.ap-south-1.amazonaws.com/uploads/...",
  "fileKey": "uploads/1234567890-abc123-medical-report.pdf",
  "expiresIn": 300,
  "message": "Pre-signed URL generated successfully"
}
```

### Step 6: Test Complete Upload Flow

```bash
# 1. Get pre-signed URL
RESPONSE=$(curl -s -X POST https://your-api-gateway-url/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","fileType":"application/pdf","fileSize":1024}')

# 2. Extract upload URL
UPLOAD_URL=$(echo $RESPONSE | jq -r '.uploadUrl')

# 3. Upload file
curl -X PUT "$UPLOAD_URL" \
  -H "Content-Type: application/pdf" \
  --data-binary "@test.pdf"

# 4. Verify in S3
aws s3 ls s3://trial-scout-medical-documents-ap-south-1/uploads/
```

## Troubleshooting

### Error: "Function not found"

Run Terraform apply first to create the Lambda function.

### Error: "Access Denied" when uploading to S3

Check IAM role has `s3:PutObject` permission.

### Error: "CORS error" in browser

1. Ensure API Gateway has CORS enabled
2. Check Lambda function returns correct CORS headers
3. Verify `Access-Control-Allow-Origin` matches your frontend domain

### Error: "Invalid file type"

Check that `fileType` is in the allowed list:
- `application/pdf`
- `image/jpeg`, `image/jpg`, `image/png`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `text/plain`

## Monitoring

### CloudWatch Logs

```bash
# View logs
aws logs tail /aws/lambda/presigned-url-generator --follow
```

### CloudWatch Metrics

- Invocations
- Errors
- Duration
- Throttles

## Next Steps

Once deployed and tested:
1. ✅ Lambda function is working
2. ✅ API Gateway endpoint is accessible
3. ⏸️ **Ready for Step 3**: React frontend integration

