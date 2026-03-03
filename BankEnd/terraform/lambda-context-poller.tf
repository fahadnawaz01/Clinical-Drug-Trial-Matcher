# ============================================================================
# Context Poller Lambda Function - Phase 5 Sub-Phase B
# Polls DynamoDB to check if a specific document has been processed
# ============================================================================

resource "aws_lambda_function" "context_poller" {
  architectures                  = ["x86_64"]
  filename                       = "placeholder.zip"
  function_name                  = "TrialScout_ContextPoller"
  handler                        = "src/index.handler"
  memory_size                    = 128
  package_type                   = "Zip"
  reserved_concurrent_executions = -1
  role                           = aws_iam_role.context_poller_lambda.arn
  runtime                        = "nodejs22.x"
  timeout                        = 10

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.patient_profiles.name
    }
  }

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/TrialScout_ContextPoller"
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

  tags = merge(
    local.common_tags,
    {
      Name = "Context Poller Lambda"
    }
  )
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "context_poller" {
  name              = "/aws/lambda/TrialScout_ContextPoller"
  retention_in_days = 7

  tags = merge(
    local.common_tags,
    {
      Name = "Context Poller Lambda Logs"
    }
  )
}

# Output the Lambda function details
output "context_poller_lambda_arn" {
  description = "ARN of the Context Poller Lambda function"
  value       = aws_lambda_function.context_poller.arn
}

output "context_poller_lambda_name" {
  description = "Name of the Context Poller Lambda function"
  value       = aws_lambda_function.context_poller.function_name
}

output "context_poller_lambda_invoke_arn" {
  description = "Invoke ARN of the Context Poller Lambda function"
  value       = aws_lambda_function.context_poller.invoke_arn
}
