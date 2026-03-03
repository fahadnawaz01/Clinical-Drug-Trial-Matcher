# ============================================================================
# IAM Role & Policies for Document Processor Lambda
# Phase 5 Sub-Phase A: Background Document Processing Engine
# ============================================================================

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# Lambda Execution Role
resource "aws_iam_role" "doc_processor_role" {
  name = "TrialScout_DocProcessor_Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name        = "TrialScout Document Processor Role"
      Description = "Execution role for async medical document processing Lambda"
    }
  )
}

# Attach AWS Lambda Basic Execution Role (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "doc_processor_basic_execution" {
  role       = aws_iam_role.doc_processor_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Inline Policy: S3 GetObject Access (documents/* path only)
resource "aws_iam_role_policy" "doc_processor_s3_access" {
  name = "TrialScout_DocProcessor_S3_Access"
  role = aws_iam_role.doc_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${module.s3_medical_documents.bucket_arn}/documents/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = module.s3_medical_documents.bucket_arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["documents/*"]
          }
        }
      }
    ]
  })
}

# Inline Policy: DynamoDB UpdateItem Access
resource "aws_iam_role_policy" "doc_processor_dynamodb_access" {
  name = "TrialScout_DocProcessor_DynamoDB_Access"
  role = aws_iam_role.doc_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.patient_profiles.arn
      }
    ]
  })
}

# Inline Policy: Textract DetectDocumentText Access
resource "aws_iam_role_policy" "doc_processor_textract_access" {
  name = "TrialScout_DocProcessor_Textract_Access"
  role = aws_iam_role.doc_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "textract:DetectDocumentText"
        ]
        Resource = "*"
      }
    ]
  })
}

# Inline Policy: Bedrock InvokeModel Access (Claude Haiku 4.5 via global inference profile - same as agents)
resource "aws_iam_role_policy" "doc_processor_bedrock_access" {
  name = "TrialScout_DocProcessor_Bedrock_Access"
  role = aws_iam_role.doc_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          # Global inference profile for Claude Haiku 4.5
          "arn:aws:bedrock:*:${data.aws_caller_identity.current.account_id}:inference-profile/*",
          # Foundation model - use wildcard for region since foundation models don't have region/account in ARN
          "arn:aws:bedrock:*::foundation-model/*"
        ]
      }
    ]
  })
}

# Output the role ARN for use in Lambda function
output "doc_processor_role_arn" {
  description = "ARN of the Document Processor Lambda execution role"
  value       = aws_iam_role.doc_processor_role.arn
}
