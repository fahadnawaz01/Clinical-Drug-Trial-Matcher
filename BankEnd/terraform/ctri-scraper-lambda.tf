# ============================================================================
# AWS Lambda Function - CTRI Scraper
# This Lambda is invoked by the Bedrock Agent Action Group to scrape CTRI trials
# ============================================================================

# IAM Role for CTRI Scraper Lambda
resource "aws_iam_role" "ctri_scraper_lambda_role" {
  name = "ctri-scraper-lambda-role"

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

  tags = {
    Name        = "CTRI Scraper Lambda Role"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "ctri_scraper_lambda_basic" {
  role       = aws_iam_role.ctri_scraper_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ctri_scraper_lambda_logs" {
  name              = "/aws/lambda/ctri-scraper-lambda"
  retention_in_days = 7

  tags = {
    Name        = "CTRI Scraper Lambda Logs"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Archive the Lambda function code (excluding node_modules)
data "archive_file" "ctri_scraper_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/ctri-scraper/src"
  output_path = "${path.module}/lambda-packages/ctri-scraper-function.zip"
}

# Archive the dependencies as a Lambda layer
data "archive_file" "ctri_scraper_layer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-functions/ctri-scraper/nodejs"
  output_path = "${path.module}/lambda-packages/ctri-scraper-layer.zip"
}

# Lambda Layer for dependencies (axios, cheerio)
resource "aws_lambda_layer_version" "ctri_scraper_dependencies" {
  filename            = data.archive_file.ctri_scraper_layer_zip.output_path
  layer_name          = "ctri-scraper-dependencies"
  compatible_runtimes = ["nodejs20.x"]
  source_code_hash    = data.archive_file.ctri_scraper_layer_zip.output_base64sha256

  description = "Dependencies for CTRI Scraper Lambda (axios, cheerio)"
}

# Lambda Function
resource "aws_lambda_function" "ctri_scraper" {
  function_name    = "ctri-scraper-lambda"
  role            = aws_iam_role.ctri_scraper_lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs20.x"
  filename        = data.archive_file.ctri_scraper_lambda_zip.output_path
  source_code_hash = data.archive_file.ctri_scraper_lambda_zip.output_base64sha256
  timeout         = 20
  memory_size     = 512
  
  layers = [aws_lambda_layer_version.ctri_scraper_dependencies.arn]

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.ctri_scraper_lambda_logs.name
  }

  tags = {
    Name        = "CTRI Scraper Lambda"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Lambda permission for Bedrock Agent to invoke
resource "aws_lambda_permission" "allow_bedrock_ctri_scraper" {
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ctri_scraper.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:agent/*"
}

# Output Lambda details
output "ctri_scraper_lambda_arn" {
  description = "ARN of the CTRI Scraper Lambda function"
  value       = aws_lambda_function.ctri_scraper.arn
}

output "ctri_scraper_lambda_name" {
  description = "Name of the CTRI Scraper Lambda function"
  value       = aws_lambda_function.ctri_scraper.function_name
}

output "ctri_scraper_lambda_version" {
  description = "Version of the CTRI Scraper Lambda function"
  value       = aws_lambda_function.ctri_scraper.version
}
