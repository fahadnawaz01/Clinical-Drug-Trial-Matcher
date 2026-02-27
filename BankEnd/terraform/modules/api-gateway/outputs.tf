# ============================================================================
# API Gateway Module Outputs
# ============================================================================

output "api_id" {
  description = "ID of the API Gateway REST API"
  value       = aws_api_gateway_rest_api.drug_trial_matches.id
}

output "api_arn" {
  description = "ARN of the API Gateway REST API"
  value       = aws_api_gateway_rest_api.drug_trial_matches.arn
}

output "invoke_url" {
  description = "Invoke URL of the API Gateway stage"
  value       = aws_api_gateway_stage.drug_trial_matcher.invoke_url
}

output "stage_name" {
  description = "Name of the API Gateway stage"
  value       = aws_api_gateway_stage.drug_trial_matcher.stage_name
}

output "deployment_id" {
  description = "ID of the API Gateway deployment"
  value       = aws_api_gateway_deployment.drug_trial_matcher.id
}

output "rest_api_id" {
  description = "REST API ID"
  value       = aws_api_gateway_rest_api.drug_trial_matches.id
}

output "rest_api_execution_arn" {
  description = "Execution ARN of the REST API"
  value       = aws_api_gateway_rest_api.drug_trial_matches.execution_arn
}
