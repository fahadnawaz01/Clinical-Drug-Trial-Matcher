# ============================================================================
# UI Agent Middlelayer Lambda Function
# Connects React frontend to AWS Bedrock Agent
# ============================================================================

# Reference existing IAM Role (created manually in console)
data "aws_iam_role" "ui_agent_middlelayer" {
  name = "ui-agent-middlelayer-role-vyybgke5"
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "ui_agent_middlelayer" {
  name              = "/aws/lambda/ui-agent-middlelayer"
  retention_in_days = 7

  tags = {
    Name        = "UI Agent Middlelayer Lambda Logs"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Lambda Function
resource "aws_lambda_function" "ui_agent_middlelayer" {
  function_name = "ui-agent-middlelayer"
  role          = data.aws_iam_role.ui_agent_middlelayer.arn
  handler       = "src/index.handler"  # Fixed: handler is in src/index.mjs
  runtime       = "nodejs20.x"
  timeout       = 90  # Increased to 90s to allow background processing to complete
  memory_size   = 256

  filename         = "${path.module}/../lambda-functions/ui-agent-middlelayer/function.zip"
  source_code_hash = filebase64sha256("${path.module}/../lambda-functions/ui-agent-middlelayer/function.zip")

  environment {
    variables = {
      AGENT_ID = var.bedrock_agent_id
    }
  }

  tags = {
    Name        = "UI Agent Middlelayer Lambda"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
    Description = "Connects React frontend to AWS Bedrock Agent"
  }

  depends_on = [
    aws_cloudwatch_log_group.ui_agent_middlelayer
  ]
}

# Output the Lambda ARN
output "ui_agent_middlelayer_arn" {
  description = "ARN of the UI Agent Middlelayer Lambda function"
  value       = aws_lambda_function.ui_agent_middlelayer.arn
}

output "ui_agent_middlelayer_name" {
  description = "Name of the UI Agent Middlelayer Lambda function"
  value       = aws_lambda_function.ui_agent_middlelayer.function_name
}
