# ============================================================================
# Update Patient Profile Lambda Function
# ============================================================================

# IAM Role for Update Profile Lambda
resource "aws_iam_role" "update_profile_lambda" {
  name = "update-patient-profile-role"
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
resource "aws_iam_role_policy_attachment" "update_profile_basic_execution" {
  role       = aws_iam_role.update_profile_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for DynamoDB access (supports document history)
resource "aws_iam_role_policy" "update_profile_dynamodb_access" {
  name = "dynamodb-patient-profile-access"
  role = aws_iam_role.update_profile_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.patient_profiles.arn
      }
    ]
  })
}

# Lambda Function
resource "aws_lambda_function" "update_profile" {
  filename         = "placeholder.zip"
  function_name    = "update-patient-profile"
  role             = aws_iam_role.update_profile_lambda.arn
  handler          = "src/index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  architectures    = ["x86_64"]
  package_type     = "Zip"

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.patient_profiles.name
      NODE_ENV   = var.environment
    }
  }

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/update-patient-profile"
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
resource "aws_cloudwatch_log_group" "update_profile" {
  name              = "/aws/lambda/update-patient-profile"
  retention_in_days = 7

  tags = local.common_tags
}

# Output Lambda ARN
output "update_profile_lambda_arn" {
  description = "ARN of the update patient profile Lambda function"
  value       = aws_lambda_function.update_profile.arn
}

output "update_profile_lambda_name" {
  description = "Name of the update patient profile Lambda function"
  value       = aws_lambda_function.update_profile.function_name
}
