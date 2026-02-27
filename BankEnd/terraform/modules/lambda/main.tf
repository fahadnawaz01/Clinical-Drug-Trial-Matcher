# ============================================================================
# Lambda Functions
# ============================================================================

# UI Agent Middlelayer Lambda
resource "aws_lambda_function" "ui_agent_middlelayer" {
  architectures                  = ["x86_64"]
  filename                       = "placeholder.zip"
  function_name                  = var.ui_agent_function_name
  handler                        = "index.handler"
  memory_size                    = var.ui_agent_memory_size
  package_type                   = "Zip"
  reserved_concurrent_executions = -1
  role                           = var.ui_agent_role_arn
  runtime                        = "nodejs20.x"
  timeout                        = var.ui_agent_timeout

  environment {
    variables = var.ui_agent_environment_variables
  }

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/${var.ui_agent_function_name}"
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

  tags = var.tags
}

# Clinical Trial API Lambda
resource "aws_lambda_function" "clinicaltrialgov_api_lambda" {
  architectures                  = ["x86_64"]
  filename                       = "placeholder.zip"
  function_name                  = var.clinical_trial_function_name
  handler                        = "index.handler"
  memory_size                    = var.clinical_trial_memory_size
  package_type                   = "Zip"
  reserved_concurrent_executions = -1
  role                           = var.clinical_trial_role_arn
  runtime                        = "nodejs20.x"
  timeout                        = var.clinical_trial_timeout

  ephemeral_storage {
    size = 512
  }

  logging_config {
    log_format = "Text"
    log_group  = "/aws/lambda/${var.clinical_trial_function_name}"
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

  tags = var.tags
}
