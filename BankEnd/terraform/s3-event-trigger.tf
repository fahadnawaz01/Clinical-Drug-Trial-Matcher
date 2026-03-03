# ============================================================================
# S3 Event Trigger for Document Processor Lambda
# Phase 5 Sub-Phase A: Background Document Processing Engine
# ============================================================================

# S3 Bucket Notification Configuration
# Triggers the Document Processor Lambda when files are uploaded to documents/ folder
resource "aws_s3_bucket_notification" "document_upload_trigger" {
  bucket = module.s3_medical_documents.bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.doc_processor.arn
    events              = ["s3:ObjectCreated:*"]
    
    # CRITICAL: Only trigger on uploads to documents/ folder
    # This prevents the Lambda from firing on other bucket assets (logs, etc.)
    filter_prefix = "documents/"
    
    # Optional: Only trigger on PDF files
    # Uncomment if you want to restrict to PDFs only
    # filter_suffix = ".pdf"
  }

  # Ensure Lambda permission is created before the notification
  depends_on = [
    aws_lambda_permission.allow_s3_invoke
  ]
}

# ============================================================================
# HOW IT WORKS:
# ============================================================================
# 1. User uploads file via presigned URL to: s3://bucket/documents/{sessionId}/file.pdf
# 2. S3 triggers ObjectCreated event
# 3. Event notification invokes TrialScout_DocProcessor Lambda
# 4. Lambda extracts sessionId from object key: documents/{sessionId}/file.pdf
# 5. Lambda downloads PDF, calls Bedrock Claude 3.5 for extraction
# 6. Lambda updates DynamoDB row for that sessionId with medical profile
# ============================================================================

# Output for verification
output "s3_event_trigger_configured" {
  description = "Confirmation that S3 event trigger is configured"
  value       = "S3 bucket '${module.s3_medical_documents.bucket_name}' will trigger Lambda '${aws_lambda_function.doc_processor.function_name}' on uploads to 'documents/' prefix"
}
