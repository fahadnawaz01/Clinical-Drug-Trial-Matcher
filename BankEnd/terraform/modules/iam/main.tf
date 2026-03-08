# ============================================================================
# IAM Roles for Lambda Functions
# ============================================================================

# UI Agent Middlelayer Role
resource "aws_iam_role" "ui_agent_middlelayer_role" {
  name = var.ui_agent_role_name
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  managed_policy_arns  = var.ui_agent_managed_policies
  max_session_duration = 3600

  tags = var.tags
}

# Inline policy for DynamoDB access (TrialFitResults table)
resource "aws_iam_role_policy" "ui_agent_dynamodb_policy" {
  name = "DynamoDBTrialFitResultsAccess"
  role = aws_iam_role.ui_agent_middlelayer_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:GetItem"
      ]
      Resource = var.dynamodb_table_arn
    }]
  })
}

# Clinical Trial API Lambda Role
resource "aws_iam_role" "clinicaltrialgov_api_lambda_role" {
  name = var.clinical_trial_role_name
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  managed_policy_arns  = var.clinical_trial_managed_policies
  max_session_duration = 3600

  tags = var.tags
}
