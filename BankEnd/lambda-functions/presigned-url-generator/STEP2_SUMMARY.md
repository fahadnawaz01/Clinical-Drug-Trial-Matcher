# Step 2 Complete: Pre-signed URL Generator Lambda

## ✅ What Was Created

### Lambda Function Code
- **Location**: `lambda-functions/presigned-url-generator/src/index.js`
- **Runtime**: Node.js 20.x
- **Dependencies**: AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)

### Key Features

#### Security
✅ 5-minute URL expiration  
✅ File type validation (PDF, JPEG, PNG, DOC, DOCX, TXT)  
✅ File size limit (10 MB)  
✅ AES256 encryption enforced  
✅ HTTPS-only uploads  

#### HIPAA Compliance
✅ Server-side encryption  
✅ Audit trail (metadata tracking)  
✅ Secure transport  

#### Cost Optimization
✅ Direct browser-to-S3 upload (no Lambda data transfer)  
✅ Minimal execution time (~100ms)  

### API Specification

**Request:**
```json
POST /presigned-url
{
  "fileName": "medical-report.pdf",
  "fileType": "application/pdf",
  "fileSize": 2048576
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://trial-scout-medical-documents-ap-south-1.s3...",
  "fileKey": "uploads/1234567890-abc123-medical-report.pdf",
  "expiresIn": 300,
  "message": "Pre-signed URL generated successfully"
}
```

### Terraform Infrastructure
- **File**: `terraform/presigned-url-lambda.tf`
- **Resources Created**:
  1. IAM Role for Lambda
  2. IAM Policy for S3 access
  3. Lambda Function
  4. CloudWatch Log Group

### Deployment Scripts
- `deploy.sh` (Linux/Mac)
- `deploy.bat` (Windows)
- `package.json` with npm scripts

## 📋 Deployment Checklist

### Infrastructure (Terraform)
```bash
cd trial-scout-frontend/BankEnd/terraform
terraform init
terraform plan
terraform apply
```

### Lambda Code
```bash
cd ../lambda-functions/presigned-url-generator
npm install --production
deploy.bat  # Windows
# or
./deploy.sh  # Linux/Mac
```

### API Gateway Integration
- Create `/presigned-url` endpoint
- Connect to Lambda function
- Enable CORS
- Deploy to stage

### Testing
```bash
# Test Lambda directly
aws lambda invoke \
  --function-name presigned-url-generator \
  --payload '{"body":"{\"fileName\":\"test.pdf\",\"fileType\":\"application/pdf\"}"}' \
  response.json

# Test via API Gateway
curl -X POST https://your-api-gateway-url/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","fileType":"application/pdf","fileSize":1024}'
```

## 🎯 What's Next

Once Lambda is deployed and tested:
1. ✅ Lambda function generates pre-signed URLs
2. ✅ API Gateway endpoint is accessible
3. ⏸️ **Ready for Step 3**: React frontend integration

## 📁 File Structure

```
BankEnd/
├── lambda-functions/
│   └── presigned-url-generator/
│       ├── src/
│       │   └── index.js              # Lambda handler
│       ├── package.json               # Dependencies
│       ├── deploy.sh                  # Linux/Mac deployment
│       ├── deploy.bat                 # Windows deployment
│       ├── .env.example               # Environment variables template
│       ├── README.md                  # Full documentation
│       ├── DEPLOY_GUIDE.md            # Step-by-step deployment
│       └── STEP2_SUMMARY.md           # This file
│
└── terraform/
    ├── presigned-url-lambda.tf        # Lambda infrastructure
    └── outputs.tf                     # Updated with Lambda outputs
```

## 💰 Cost Impact

### Additional Costs (Step 2)
- Lambda invocations: $0.0002 per 1,000 requests
- Lambda duration: $0.0001 per 1,000 requests (100ms avg)
- CloudWatch Logs: $0.50/GB (minimal)

### Total Cost (1,000 uploads/month)
- S3: $0.85/month (from Step 1)
- Lambda: $0.0003/month
- **Total: ~$0.85/month** (Lambda cost is negligible)

## 🔒 Security Notes

### Current Configuration
- CORS: `*` (all origins) - **Change for production**
- Authentication: None - **Add API Gateway authorizer for production**
- Rate limiting: None - **Add API Gateway throttling for production**

### Production Recommendations
1. Update CORS to specific domain
2. Add authentication (Cognito, API Key, or custom authorizer)
3. Enable API Gateway throttling
4. Enable AWS WAF
5. Set up CloudWatch Alarms

## 📊 Architecture

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Browser │─────▶│   API   │─────▶│ Lambda  │─────▶│   S3    │
│         │      │ Gateway │      │ Function│      │ Bucket  │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
     │                                                    ▲
     │                                                    │
     └────────────────────────────────────────────────────┘
              Direct upload using pre-signed URL
```

## ✅ Step 2 Status: READY FOR DEPLOYMENT

All code and infrastructure files are created. Follow the deployment checklist above to deploy.

**Once deployed, confirm it's working before proceeding to Step 3 (React frontend).**

