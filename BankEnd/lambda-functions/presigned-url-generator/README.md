# Pre-signed URL Generator Lambda Function

Generates secure S3 pre-signed URLs for direct browser uploads of medical documents.

## Features

✅ **Security**
- 5-minute URL expiration
- File type validation (PDF, JPEG, PNG, DOC, DOCX, TXT)
- File size limit (10 MB)
- AES256 encryption enforced
- HTTPS-only uploads

✅ **HIPAA Compliance**
- Server-side encryption (AES256)
- Audit trail (metadata tracking)
- Secure transport (HTTPS)

✅ **Cost Optimization**
- Direct browser-to-S3 upload (no Lambda data transfer)
- Minimal Lambda execution time

## API Specification

### Request

**Method**: POST  
**Content-Type**: application/json

```json
{
  "fileName": "medical-report.pdf",
  "fileType": "application/pdf",
  "fileSize": 2048576
}
```

### Response (Success)

**Status**: 200

```json
{
  "success": true,
  "uploadUrl": "https://trial-scout-medical-documents-ap-south-1.s3.ap-south-1.amazonaws.com/uploads/...",
  "fileKey": "uploads/1234567890-abc123-medical-report.pdf",
  "expiresIn": 300,
  "message": "Pre-signed URL generated successfully"
}
```

### Response (Error)

**Status**: 400/500

```json
{
  "error": "Invalid file type",
  "message": "Allowed types: PDF, JPEG, PNG, DOC, DOCX, TXT",
  "allowedTypes": ["application/pdf", "image/jpeg", ...]
}
```

## Allowed File Types

- **PDF**: `application/pdf`
- **JPEG**: `image/jpeg`, `image/jpg`
- **PNG**: `image/png`
- **Word**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Text**: `text/plain`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BUCKET_NAME` | S3 bucket name | `trial-scout-medical-documents-ap-south-1` |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `NODE_ENV` | Environment | `production` |

### Constants (in code)

```javascript
const URL_EXPIRATION = 300;  // 5 minutes
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
```

## Deployment

### Option 1: Using Terraform (Recommended)

See `terraform/modules/lambda/` for infrastructure code.

### Option 2: Manual Deployment

```bash
# Install dependencies
npm install --production

# Deploy (Linux/Mac)
./deploy.sh

# Deploy (Windows)
deploy.bat
```

### Option 3: AWS CLI

```bash
# Package
npm install --production
zip -r function.zip src/ node_modules/

# Deploy
aws lambda update-function-code \
  --function-name presigned-url-generator \
  --zip-file fileb://function.zip \
  --region ap-south-1
```

## Testing

### Local Test

```bash
# Install dependencies
npm install

# Run tests
npm test
```

### AWS Console Test

```json
{
  "body": "{\"fileName\":\"test.pdf\",\"fileType\":\"application/pdf\",\"fileSize\":1024}"
}
```

### cURL Test

```bash
curl -X POST https://your-api-gateway-url/presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "medical-report.pdf",
    "fileType": "application/pdf",
    "fileSize": 2048576
  }'
```

## IAM Permissions Required

The Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::trial-scout-medical-documents-ap-south-1/*"
    }
  ]
}
```

## Security Considerations

### Production Checklist

- [ ] Update CORS origin from `*` to specific domain
- [ ] Enable CloudWatch Logs
- [ ] Set up CloudWatch Alarms for errors
- [ ] Implement rate limiting (API Gateway)
- [ ] Add authentication (API Gateway authorizer)
- [ ] Enable AWS WAF for DDoS protection
- [ ] Review and restrict IAM permissions

### CORS Configuration

For production, update the CORS origin:

```javascript
const headers = {
  'Access-Control-Allow-Origin': 'https://your-production-domain.com',
  // ...
};
```

## Monitoring

### CloudWatch Metrics

- Invocations
- Errors
- Duration
- Throttles

### CloudWatch Logs

All requests are logged with:
- Event details
- Generated file keys
- Errors (if any)

### Recommended Alarms

1. Error rate > 5%
2. Duration > 3 seconds
3. Throttles > 0

## Cost Estimate

### Per 1,000 Uploads

- Lambda invocations: $0.0002
- Lambda duration (100ms avg): $0.0001
- **Total**: ~$0.0003 per 1,000 uploads

### Monthly Cost (10,000 uploads)

- Lambda: ~$0.003
- S3 PUT requests: ~$0.05
- **Total**: ~$0.053/month

## Troubleshooting

### Error: "Missing required fields"

Ensure request body includes `fileName` and `fileType`.

### Error: "Invalid file type"

Check that `fileType` is in the allowed list.

### Error: "File too large"

Maximum file size is 10 MB. Compress or split the file.

### Error: "Access Denied"

Check Lambda execution role has S3 PutObject permissions.

## Architecture

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

## Next Steps

1. Deploy Lambda function
2. Create API Gateway endpoint
3. Test with cURL or Postman
4. Integrate with React frontend (Step 3)

