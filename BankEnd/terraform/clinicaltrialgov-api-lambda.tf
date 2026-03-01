# ============================================================================
# AWS Lambda Function - ClinicalTrials.gov API Integration
# This Lambda is invoked by the Bedrock Agent Action Group
# ============================================================================

# Data source for existing IAM role
data "aws_iam_role" "clinicaltrialgov_lambda_role" {
  name = "clinicaltrialgov-api-lambda-role-5vkf0niy"
}

# Data source for existing CloudWatch Log Group
data "aws_cloudwatch_log_group" "clinicaltrialgov_lambda_logs" {
  name = "/aws/lambda/clinicaltrialgov-api-lambda"
}

# Archive the Lambda function code
data "archive_file" "clinicaltrialgov_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/clinicaltrialgov-api-lambda/src"
  output_path = "${path.module}/../lambda-functions/clinicaltrialgov-api-lambda/function.zip"
}

# Lambda Function
resource "aws_lambda_function" "clinicaltrialgov_api" {
  function_name    = "clinicaltrialgov-api-lambda"
  role            = data.aws_iam_role.clinicaltrialgov_lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  filename        = data.archive_file.clinicaltrialgov_lambda_zip.output_path
  source_code_hash = data.archive_file.clinicaltrialgov_lambda_zip.output_base64sha256
  timeout         = 15
  memory_size     = 128

  logging_config {
    log_format = "Text"
    log_group  = data.aws_cloudwatch_log_group.clinicaltrialgov_lambda_logs.name
  }

  tags = {
    Name        = "ClinicalTrials.gov API Lambda"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Output Lambda details
output "clinicaltrialgov_lambda_arn" {
  description = "ARN of the ClinicalTrials.gov API Lambda function"
  value       = aws_lambda_function.clinicaltrialgov_api.arn
}

output "clinicaltrialgov_lambda_name" {
  description = "Name of the ClinicalTrials.gov API Lambda function"
  value       = aws_lambda_function.clinicaltrialgov_api.function_name
}

output "clinicaltrialgov_lambda_version" {
  description = "Version of the ClinicalTrials.gov API Lambda function"
  value       = aws_lambda_function.clinicaltrialgov_api.version
}
