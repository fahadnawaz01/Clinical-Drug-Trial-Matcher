# ============================================================================
# API Gateway Integration for Update Patient Profile
# ============================================================================

# Create /update-profile resource
resource "aws_api_gateway_resource" "update_profile" {
  rest_api_id = module.api_gateway.rest_api_id
  parent_id   = data.aws_api_gateway_resource.root.id
  path_part   = "update-profile"
}

# POST method for /update-profile
resource "aws_api_gateway_method" "update_profile_post" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.update_profile.id
  http_method   = "POST"
  authorization = "NONE"
}

# Lambda integration for POST /update-profile
resource "aws_api_gateway_integration" "update_profile_lambda" {
  rest_api_id             = module.api_gateway.rest_api_id
  resource_id             = aws_api_gateway_resource.update_profile.id
  http_method             = aws_api_gateway_method.update_profile_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.update_profile.invoke_arn
}

# Lambda permission for API Gateway to invoke the function
resource "aws_lambda_permission" "update_profile_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_profile.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.rest_api_execution_arn}/*/*"
}

# ============================================================================
# CORS Configuration for /update-profile
# ============================================================================

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "update_profile_options" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.update_profile.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Mock integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "update_profile_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.update_profile.id
  http_method = aws_api_gateway_method.update_profile_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS method response
resource "aws_api_gateway_method_response" "update_profile_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.update_profile.id
  http_method = aws_api_gateway_method.update_profile_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# OPTIONS integration response
resource "aws_api_gateway_integration_response" "update_profile_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.update_profile.id
  http_method = aws_api_gateway_method.update_profile_options.http_method
  status_code = aws_api_gateway_method_response.update_profile_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.update_profile_options
  ]
}

# ============================================================================
# Deployment Trigger
# ============================================================================

# Combined deployment for both presigned-url and update-profile endpoints
resource "aws_api_gateway_deployment" "combined_deployment" {
  rest_api_id = module.api_gateway.rest_api_id

  triggers = {
    # Trigger redeployment when any endpoint configuration changes
    redeployment = sha1(jsonencode([
      # Presigned URL endpoint
      aws_api_gateway_resource.presigned_url.id,
      aws_api_gateway_method.presigned_url_post.id,
      aws_api_gateway_method.presigned_url_options.id,
      aws_api_gateway_integration.presigned_url_lambda.id,
      aws_api_gateway_integration.presigned_url_options.id,
      # Update Profile endpoint
      aws_api_gateway_resource.update_profile.id,
      aws_api_gateway_method.update_profile_post.id,
      aws_api_gateway_method.update_profile_options.id,
      aws_api_gateway_integration.update_profile_lambda.id,
      aws_api_gateway_integration.update_profile_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    # Presigned URL dependencies
    aws_api_gateway_integration.presigned_url_lambda,
    aws_api_gateway_integration.presigned_url_options,
    aws_api_gateway_integration_response.presigned_url_options,
    aws_api_gateway_integration_response.presigned_url_post,
    # Update Profile dependencies
    aws_api_gateway_integration.update_profile_lambda,
    aws_api_gateway_integration.update_profile_options,
    aws_api_gateway_integration_response.update_profile_options,
  ]
}

# Output the endpoint URLs
output "update_profile_endpoint" {
  description = "Full URL for the update profile endpoint"
  value       = "${module.api_gateway.invoke_url}/update-profile"
}

output "presigned_url_endpoint" {
  description = "Full URL for the presigned URL endpoint"
  value       = "${module.api_gateway.invoke_url}/presigned-url"
}
