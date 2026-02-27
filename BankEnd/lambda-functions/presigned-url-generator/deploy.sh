#!/bin/bash
# ============================================================================
# Deploy Pre-signed URL Generator Lambda Function
# ============================================================================

set -e

FUNCTION_NAME="presigned-url-generator"
REGION="ap-south-1"
BUCKET_NAME="trial-scout-medical-documents-ap-south-1"

echo "🚀 Deploying $FUNCTION_NAME Lambda function..."
echo ""

# Navigate to function directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Create deployment package
echo "📦 Creating deployment package..."
zip -r function.zip src/ node_modules/ -x "*.git*" "*.DS_Store"

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "🔄 Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION

  # Update environment variables
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$REGION}" \
    --region $REGION

else
  echo "❌ Lambda function $FUNCTION_NAME does not exist."
  echo "Please create it first using Terraform or AWS Console."
  exit 1
fi

# Clean up
echo "🧹 Cleaning up..."
rm function.zip

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test the function:"
echo "aws lambda invoke --function-name $FUNCTION_NAME --region $REGION --payload '{\"body\":\"{\\\"fileName\\\":\\\"test.pdf\\\",\\\"fileType\\\":\\\"application/pdf\\\"}\"}' response.json"
