# ============================================================================
# API Gateway Configuration for Context Status Endpoint
# GET /context-status - Polls DynamoDB for document processing status
# ============================================================================

# Create /context-status resource
resource "aws_api_gateway_resource" "context_status" {
  rest_api_id = module.api_gateway.rest_api_id
  parent_id   = data.aws_api_gateway_resource.root.id
  path_part   = "context-status"
}

# GET Method for /context-status
resource "aws_api_gateway_method" "context_status_get" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.context_status.id
  http_method   = "GET"
  authorization = "NONE"
}

# Lambda Integration for GET /context-status
resource "aws_api_gateway_integration" "context_status_lambda" {
  rest_api_id             = module.api_gateway.rest_api_id
  resource_id             = aws_api_gateway_resource.context_status.id
  http_method             = aws_api_gateway_method.context_status_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.context_poller.invoke_arn
}

# Lambda Permission for API Gateway to invoke Context Poller
resource "aws_lambda_permission" "context_status_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.context_poller.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.rest_api_execution_arn}/*/*"
}

# OPTIONS Method for CORS preflight
resource "aws_api_gateway_method" "context_status_options" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.context_status.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Mock Integration for OPTIONS
resource "aws_api_gateway_integration" "context_status_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.context_status.id
  http_method = aws_api_gateway_method.context_status_options.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Method Response for OPTIONS
resource "aws_api_gateway_method_response" "context_status_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.context_status.id
  http_method = aws_api_gateway_method.context_status_options.http_method
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

# Integration Response for OPTIONS
resource "aws_api_gateway_integration_response" "context_status_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.context_status.id
  http_method = aws_api_gateway_method.context_status_options.http_method
  status_code = aws_api_gateway_method_response.context_status_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.context_status_options
  ]
}

# Method Response for GET
resource "aws_api_gateway_method_response" "context_status_get" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.context_status.id
  http_method = aws_api_gateway_method.context_status_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# Integration Response for GET
resource "aws_api_gateway_integration_response" "context_status_get" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.context_status.id
  http_method = aws_api_gateway_method.context_status_get.http_method
  status_code = aws_api_gateway_method_response.context_status_get.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.context_status_lambda
  ]
}

# Output the endpoint URL
output "context_status_endpoint_url" {
  description = "URL of the context-status endpoint"
  value       = "${module.api_gateway.invoke_url}/context-status"
}
