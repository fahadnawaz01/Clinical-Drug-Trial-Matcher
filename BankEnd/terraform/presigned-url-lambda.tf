# ============================================================================
# Pre-signed URL Generator Lambda Function
# ============================================================================

# IAM Role for Pre-signed URL Generator Lambda
resource "aws_iam_role" "presigned_url_generator" {
  name = "presigned-url-generator-role"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = local.common_tags
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "presigned_url_basic_execution" {
  role       = aws_iam_role.presigned_url_generator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for S3 PutObject (needed for pre-signed URLs)
resource "aws_iam_role_policy" "presigned_url_s3_access" {
  name = "s3-presigned-url-access"
  role = aws_iam_role.presigned_url_generator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl"
        ]
        Resource = "${module.s3_medical_documents.bucket_arn}/*"
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "presigned_url_generator" {
  filename         = "placeholder.zip"
  function_name    = "presigned-url-generator"
  role             = aws_iam_role.presigned_url_generator.arn
  handler          = "src/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  architectures    = ["x86_64"]
  package_type     = "Zip"

  environment {
    variables = {
      BUCKET_NAME = module.s3_medical_documents.bucket_name
      NODE_ENV    = var.environment
    }
  }

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/presigned-url-generator"
  }

  tracing_config {
    mode = "PassThrough"
  }

  # Ignore code changes - managed outside Terraform
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
    ]
  }

  tags = local.common_tags
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "presigned_url_generator" {
  name              = "/aws/lambda/presigned-url-generator"
  retention_in_days = 7

  tags = local.common_tags
}
