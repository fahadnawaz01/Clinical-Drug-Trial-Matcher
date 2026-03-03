# ============================================================================
# Document Processor Lambda Function
# Phase 5 Sub-Phase A: Background Document Processing Engine
# ============================================================================

# Data source to create a dummy zip file for initial deployment
data "archive_file" "doc_processor_dummy" {
  type        = "zip"
  output_path = "${path.module}/lambda-packages/document-processor-dummy.zip"

  source {
    content  = "exports.handler = async (event) => { console.log('Placeholder - deploy actual code'); };"
    filename = "index.js"
  }
}

# Lambda Function: Document Processor
resource "aws_lambda_function" "doc_processor" {
  function_name = "TrialScout_DocProcessor"
  description   = "Asynchronously processes medical documents using Bedrock Claude 3.5"
  
  # Use dummy zip for initial deployment
  # TODO: Replace with actual deployment package after running npm install and creating zip
  filename         = data.archive_file.doc_processor_dummy.output_path
  source_code_hash = data.archive_file.doc_processor_dummy.output_base64sha256
  
  handler = "src/index.handler"
  runtime = "nodejs20.x"
  
  # Attach the IAM role from Step 1
  role = aws_iam_role.doc_processor_role.arn
  
  # Timeout: 5 minutes (Bedrock + S3 + DynamoDB operations can take time)
  timeout = 300
  
  # Memory: 1024 MB (PDF processing + Bedrock API calls need memory)
  memory_size = 1024
  
  # Environment variables
  environment {
    variables = {
      DYNAMODB_TABLE_NAME  = aws_dynamodb_table.patient_profiles.name
      S3_BUCKET_NAME       = module.s3_medical_documents.bucket_name
    }
  }
  
  tags = merge(
    local.common_tags,
    {
      Name        = "TrialScout Document Processor"
      Description = "Async medical document processing with Bedrock"
    }
  )
}

# Lambda Permission: Allow S3 to invoke this function
resource "aws_lambda_permission" "allow_s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.doc_processor.function_name
  principal     = "s3.amazonaws.com"
  
  # Reference the existing S3 bucket ARN
  source_arn = module.s3_medical_documents.bucket_arn
}

# CloudWatch Log Group (for better log retention control)
resource "aws_cloudwatch_log_group" "doc_processor_logs" {
  name              = "/aws/lambda/${aws_lambda_function.doc_processor.function_name}"
  retention_in_days = 7
  
  tags = merge(
    local.common_tags,
    {
      Name = "TrialScout Document Processor Logs"
    }
  )
}

# Output the Lambda function ARN
output "doc_processor_function_arn" {
  description = "ARN of the Document Processor Lambda function"
  value       = aws_lambda_function.doc_processor.arn
}

output "doc_processor_function_name" {
  description = "Name of the Document Processor Lambda function"
  value       = aws_lambda_function.doc_processor.function_name
}

# ============================================================================
# DEPLOYMENT NOTES:
# ============================================================================
# After terraform apply, you need to:
# 1. cd lambda-functions/document-processor
# 2. npm install
# 3. zip -r document-processor.zip src/ node_modules/ package.json
# 4. aws lambda update-function-code \
#      --function-name TrialScout_DocProcessor \
#      --zip-file fileb://document-processor.zip \
#      --region ap-south-1
# ============================================================================
