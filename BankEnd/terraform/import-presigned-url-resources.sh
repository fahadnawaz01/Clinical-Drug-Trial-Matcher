#!/bin/bash

# Import existing API Gateway resources for /presigned-url endpoint

REST_API_ID="rk1zsye504"
RESOURCE_ID="71hpth"

echo "Importing /presigned-url API Gateway resources..."

# Import resource
terraform import aws_api_gateway_resource.presigned_url "${REST_API_ID}/${RESOURCE_ID}"

# Import POST method
terraform import aws_api_gateway_method.presigned_url_post "${REST_API_ID}/${RESOURCE_ID}/POST"

# Import OPTIONS method
terraform import aws_api_gateway_method.presigned_url_options "${REST_API_ID}/${RESOURCE_ID}/OPTIONS"

# Import Lambda integration
terraform import aws_api_gateway_integration.presigned_url_lambda "${REST_API_ID}/${RESOURCE_ID}/POST"

# Import OPTIONS integration
terraform import aws_api_gateway_integration.presigned_url_options "${REST_API_ID}/${RESOURCE_ID}/OPTIONS"

# Import Lambda permission
terraform import aws_lambda_permission.presigned_url_api_gateway "presigned-url-generator/AllowAPIGatewayInvoke"

echo "Import complete!"
