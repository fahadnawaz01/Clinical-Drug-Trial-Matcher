# ============================================================================
# S3 Bucket for Medical Document Storage
# ============================================================================

resource "aws_s3_bucket" "medical_documents" {
  bucket = var.bucket_name

  tags = var.tags
}

# Server-Side Encryption (AES256)
resource "aws_s3_bucket_server_side_encryption_configuration" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Block ALL Public Access (HIPAA Compliance)
resource "aws_s3_bucket_public_access_block" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS Configuration for Direct Browser Upload
resource "aws_s3_bucket_cors_configuration" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  cors_rule {
    allowed_headers = [
      "*"
    ]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag", "x-amz-server-side-encryption", "x-amz-request-id"]
    max_age_seconds = 3000
  }
}

# Versioning (Best Practice for Medical Records)
resource "aws_s3_bucket_versioning" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle Policy (Optional: Archive old versions to Glacier)
resource "aws_s3_bucket_lifecycle_configuration" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  rule {
    id     = "archive-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Bucket Logging (Audit Trail)
resource "aws_s3_bucket_logging" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id

  target_bucket = var.logging_bucket_name != "" ? var.logging_bucket_name : aws_s3_bucket.medical_documents.id
  target_prefix = "access-logs/"
}

# HIPAA Requirement: Enforce HTTPS Only (Deny HTTP)
resource "aws_s3_bucket_policy" "enforce_https" {
  bucket = aws_s3_bucket.medical_documents.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.medical_documents.arn,
          "${aws_s3_bucket.medical_documents.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      }
    ]
  })
}

# Cost Optimization: Intelligent-Tiering (Auto-archive infrequently accessed files)
resource "aws_s3_bucket_intelligent_tiering_configuration" "medical_documents" {
  bucket = aws_s3_bucket.medical_documents.id
  name   = "EntireBucket"

  status = "Enabled"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}
