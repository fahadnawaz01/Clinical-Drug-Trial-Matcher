# ============================================================================
# AWS Bedrock Knowledge Base - CTRI Data Source (Indian Clinical Trials)
# ============================================================================

# Random suffix for globally unique bucket name
resource "random_string" "kb_bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# ============================================================================
# Task 1: Knowledge Base S3 Bucket
# ============================================================================

# S3 Bucket for CTRI Knowledge Base data source
resource "aws_s3_bucket" "trialscout_ctri_kb_data_source" {
  bucket = "trialscout-ctri-kb-data-source-${random_string.kb_bucket_suffix.result}"

  tags = {
    Name        = "TrialScout CTRI Knowledge Base Data Source"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = var.environment
    Purpose     = "Bedrock Knowledge Base Indian Clinical Trials"
    DataType    = "Healthcare"
  }
}

# Block all public access to the Knowledge Base bucket
resource "aws_s3_bucket_public_access_block" "trialscout_ctri_kb_data_source" {
  bucket = aws_s3_bucket.trialscout_ctri_kb_data_source.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption for healthcare data at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "trialscout_ctri_kb_data_source" {
  bucket = aws_s3_bucket.trialscout_ctri_kb_data_source.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Enable versioning for data protection
resource "aws_s3_bucket_versioning" "trialscout_ctri_kb_data_source" {
  bucket = aws_s3_bucket.trialscout_ctri_kb_data_source.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ============================================================================
# Task 2: IAM Policy for Bedrock Agent to Access Knowledge Base
# ============================================================================

# IAM Policy: S3 Read Access for Knowledge Base
resource "aws_iam_policy" "bedrock_agent_kb_s3_access" {
  name        = "TrialScout_BedrockAgent_KB_S3_Access"
  path        = "/service-role/"
  description = "Allows Bedrock Agent to read CTRI Knowledge Base data from S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.trialscout_ctri_kb_data_source.arn
        ]
      },
      {
        Sid    = "AllowS3GetObject"
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.trialscout_ctri_kb_data_source.arn}/*"
        ]
      }
    ]
  })

  tags = {
    Name        = "Bedrock Agent KB S3 Access Policy"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = var.environment
  }
}

# Attach KB S3 Access Policy to Bedrock Supervisor Agent Role
resource "aws_iam_role_policy_attachment" "bedrock_supervisor_kb_s3_access" {
  role       = aws_iam_role.bedrock_agent.name
  policy_arn = aws_iam_policy.bedrock_agent_kb_s3_access.arn
}

# Attach KB S3 Access Policy to Clinical Specialist Agent Role
resource "aws_iam_role_policy_attachment" "bedrock_clinical_specialist_kb_s3_access" {
  role       = aws_iam_role.bedrock_clinical_specialist.name
  policy_arn = aws_iam_policy.bedrock_agent_kb_s3_access.arn
}

# Attach KB S3 Access Policy to Fast Agent Role
resource "aws_iam_role_policy_attachment" "bedrock_fast_agent_kb_s3_access" {
  role       = aws_iam_role.bedrock_fast_agent.name
  policy_arn = aws_iam_policy.bedrock_agent_kb_s3_access.arn
}

# ============================================================================
# IAM Role for Bedrock Knowledge Base Service
# ============================================================================

# IAM Role for Bedrock Knowledge Base to access S3
resource "aws_iam_role" "bedrock_kb_role" {
  name = "AmazonBedrockExecutionRoleForKnowledgeBase_CTRI"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Bedrock Knowledge Base Execution Role"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = var.environment
  }
}

# Inline policy for Knowledge Base to access S3 data source
resource "aws_iam_role_policy" "bedrock_kb_s3_access" {
  name = "BedrockKB_S3_Access"
  role = aws_iam_role.bedrock_kb_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.trialscout_ctri_kb_data_source.arn
        ]
      },
      {
        Sid    = "AllowS3GetObject"
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.trialscout_ctri_kb_data_source.arn}/*"
        ]
      }
    ]
  })
}

# ============================================================================
# Outputs
# ============================================================================

output "kb_s3_bucket_name" {
  description = "Name of the Knowledge Base S3 bucket for CTRI data"
  value       = aws_s3_bucket.trialscout_ctri_kb_data_source.id
}

output "kb_s3_bucket_arn" {
  description = "ARN of the Knowledge Base S3 bucket"
  value       = aws_s3_bucket.trialscout_ctri_kb_data_source.arn
}

output "bedrock_kb_role_arn" {
  description = "ARN of the Bedrock Knowledge Base execution role"
  value       = aws_iam_role.bedrock_kb_role.arn
}

output "bedrock_kb_role_name" {
  description = "Name of the Bedrock Knowledge Base execution role"
  value       = aws_iam_role.bedrock_kb_role.name
}
