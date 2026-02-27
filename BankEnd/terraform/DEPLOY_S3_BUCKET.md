# Deploy Medical Documents S3 Bucket

## Step 1: Initialize and Deploy

```bash
cd trial-scout-frontend/BankEnd/terraform

# Initialize new module
terraform init

# Review what will be created
terraform plan

# Deploy the S3 bucket
terraform apply
```

## What Gets Created

### S3 Bucket
- **Name**: `trial-scout-medical-documents-ap-south-1`
- **Encryption**: AES256 (server-side)
- **Public Access**: Completely blocked (HIPAA compliant)
- **Versioning**: Enabled (audit trail)
- **CORS**: Configured for direct browser uploads

### Security Features
1. ✅ Server-side encryption (AES256)
2. ✅ Block all public access
3. ✅ Versioning enabled
4. ✅ Access logging enabled
5. ✅ Lifecycle policies (archive to Glacier after 90 days)
6. ✅ Auto-delete incomplete uploads after 7 days

### CORS Configuration
Allows direct browser uploads from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative dev server)

**Allowed Methods**: PUT, POST, GET  
**Allowed Headers**: Content-Type, Content-Length, Authorization, etc.

## Expected Output

After successful deployment, you should see:

```
Apply complete! Resources: 6 added, 0 changed, 0 destroyed.

Outputs:

s3_medical_documents_bucket_name = "trial-scout-medical-documents-ap-south-1"
s3_medical_documents_bucket_arn = "arn:aws:s3:::trial-scout-medical-documents-ap-south-1"
```

## Verification

```bash
# Check bucket exists
aws s3 ls | grep trial-scout-medical-documents

# Verify encryption
aws s3api get-bucket-encryption --bucket trial-scout-medical-documents-ap-south-1

# Verify public access block
aws s3api get-public-access-block --bucket trial-scout-medical-documents-ap-south-1

# Verify CORS
aws s3api get-bucket-cors --bucket trial-scout-medical-documents-ap-south-1
```

## Troubleshooting

### Error: Bucket name already exists
S3 bucket names are globally unique. If you get this error:
1. Change `project_name_lower` in `variables.tf`
2. Or add a unique suffix: `trial-scout-medical-docs-${random_id}`

### Error: Module not found
```bash
terraform init
```

### Error: Access Denied
Ensure your AWS credentials have permissions to create S3 buckets.

## Next Steps

Once deployed successfully:
1. ✅ Note the bucket name from outputs
2. ⏸️ **STOP HERE** - Wait for approval before proceeding to Step 2 (Lambda function)
3. The bucket is now ready to receive pre-signed URL uploads

## Production Considerations

Before going to production, update CORS origins:

```hcl
# In terraform.tfvars
cors_allowed_origins = [
  "https://your-production-domain.com",
  "https://www.your-production-domain.com"
]
```

## Cost Estimate

- **S3 Storage**: ~$0.023 per GB/month (Standard)
- **S3 Requests**: ~$0.005 per 1,000 PUT requests
- **Data Transfer**: First 1 GB/month free, then $0.09/GB

For 1,000 documents (~10 MB each):
- Storage: ~$0.23/month
- Uploads: ~$0.005/month
- **Total**: ~$0.24/month

