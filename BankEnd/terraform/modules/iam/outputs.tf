# ============================================================================
# IAM Module Outputs
# ============================================================================

output "ui_agent_role_arn" {
  description = "ARN of the UI agent IAM role"
  value       = aws_iam_role.ui_agent_middlelayer_role.arn
}

output "ui_agent_role_name" {
  description = "Name of the UI agent IAM role"
  value       = aws_iam_role.ui_agent_middlelayer_role.name
}

output "clinical_trial_role_arn" {
  description = "ARN of the clinical trial API IAM role"
  value       = aws_iam_role.clinicaltrialgov_api_lambda_role.arn
}

output "clinical_trial_role_name" {
  description = "Name of the clinical trial API IAM role"
  value       = aws_iam_role.clinicaltrialgov_api_lambda_role.name
}
