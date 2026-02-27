# ============================================================================
# Lambda Module Outputs
# ============================================================================

output "ui_agent_function_arn" {
  description = "ARN of the UI agent Lambda function"
  value       = aws_lambda_function.ui_agent_middlelayer.arn
}

output "ui_agent_function_name" {
  description = "Name of the UI agent Lambda function"
  value       = aws_lambda_function.ui_agent_middlelayer.function_name
}

output "clinical_trial_function_arn" {
  description = "ARN of the clinical trial API Lambda function"
  value       = aws_lambda_function.clinicaltrialgov_api_lambda.arn
}

output "clinical_trial_function_name" {
  description = "Name of the clinical trial API Lambda function"
  value       = aws_lambda_function.clinicaltrialgov_api_lambda.function_name
}
