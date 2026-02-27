# ============================================================================
# Outputs
# ============================================================================

output "api_gateway_endpoint" {
  description = "API Gateway invoke URL"
  value       = module.api_gateway.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = module.api_gateway.api_id
}

output "ui_agent_lambda_arn" {
  description = "UI Agent Lambda function ARN"
  value       = module.lambda.ui_agent_function_arn
}

output "clinical_trial_lambda_arn" {
  description = "Clinical Trial API Lambda function ARN"
  value       = module.lambda.clinical_trial_function_arn
}

output "ui_agent_role_arn" {
  description = "UI Agent IAM role ARN"
  value       = module.iam.ui_agent_role_arn
}

output "clinical_trial_role_arn" {
  description = "Clinical Trial API IAM role ARN"
  value       = module.iam.clinical_trial_role_arn
}

output "s3_medical_documents_bucket_name" {
  description = "S3 bucket name for medical documents"
  value       = module.s3_medical_documents.bucket_name
}

output "s3_medical_documents_bucket_arn" {
  description = "S3 bucket ARN for medical documents"
  value       = module.s3_medical_documents.bucket_arn
}

output "presigned_url_lambda_arn" {
  description = "Pre-signed URL Generator Lambda ARN"
  value       = aws_lambda_function.presigned_url_generator.arn
}

output "presigned_url_lambda_name" {
  description = "Pre-signed URL Generator Lambda function name"
  value       = aws_lambda_function.presigned_url_generator.function_name
}
