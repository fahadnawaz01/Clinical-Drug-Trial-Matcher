# ============================================================================
# API Gateway Integration for Pre-signed URL Generator
# ============================================================================

# Get the root resource of the API Gateway
data "aws_api_gateway_resource" "root" {
  rest_api_id = module.api_gateway.rest_api_id
  path        = "/"
}

# Create /presigned-url resource
resource "aws_api_gateway_resource" "presigned_url" {
  rest_api_id = module.api_gateway.rest_api_id
  parent_id   = data.aws_api_gateway_resource.root.id
  path_part   = "presigned-url"
}

# POST method for /presigned-url
resource "aws_api_gateway_method" "presigned_url_post" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "POST"
  authorization = "NONE"
}

# Lambda integration for POST /presigned-url
resource "aws_api_gateway_integration" "presigned_url_lambda" {
  rest_api_id             = module.api_gateway.rest_api_id
  resource_id             = aws_api_gateway_resource.presigned_url.id
  http_method             = aws_api_gateway_method.presigned_url_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.presigned_url_generator.invoke_arn
}

# Lambda permission for API Gateway to invoke the function
resource "aws_lambda_permission" "presigned_url_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.presigned_url_generator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.rest_api_execution_arn}/*/*"
}

# ============================================================================
# CORS Configuration for /presigned-url
# ============================================================================

# OPTIONS method for CORS preflight
resource "aws_api_gateway_method" "presigned_url_options" {
  rest_api_id   = module.api_gateway.rest_api_id
  resource_id   = aws_api_gateway_resource.presigned_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Mock integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "presigned_url_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# OPTIONS method response
resource "aws_api_gateway_method_response" "presigned_url_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_options.http_method
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
resource "aws_api_gateway_integration_response" "presigned_url_options" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_options.http_method
  status_code = aws_api_gateway_method_response.presigned_url_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.presigned_url_options
  ]
}

# POST method response (for CORS headers)
resource "aws_api_gateway_method_response" "presigned_url_post" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_post.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# POST integration response (for CORS headers)
resource "aws_api_gateway_integration_response" "presigned_url_post" {
  rest_api_id = module.api_gateway.rest_api_id
  resource_id = aws_api_gateway_resource.presigned_url.id
  http_method = aws_api_gateway_method.presigned_url_post.http_method
  status_code = aws_api_gateway_method_response.presigned_url_post.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.presigned_url_lambda
  ]
}

# ============================================================================
# Deployment Trigger
# ============================================================================

# Create a new deployment when this configuration changes
resource "aws_api_gateway_deployment" "presigned_url_deployment" {
  rest_api_id = module.api_gateway.rest_api_id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.presigned_url.id,
      aws_api_gateway_method.presigned_url_post.id,
      aws_api_gateway_method.presigned_url_options.id,
      aws_api_gateway_integration.presigned_url_lambda.id,
      aws_api_gateway_integration.presigned_url_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.presigned_url_lambda,
    aws_api_gateway_integration.presigned_url_options,
    aws_api_gateway_integration_response.presigned_url_options,
    aws_api_gateway_integration_response.presigned_url_post,
  ]
}
