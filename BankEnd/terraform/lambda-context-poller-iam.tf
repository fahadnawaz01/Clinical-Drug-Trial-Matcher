# ============================================================================
# IAM Role and Policy for Context Poller Lambda
# ============================================================================

# IAM Role for Context Poller Lambda
resource "aws_iam_role" "context_poller_lambda" {
  name = "TrialScout_ContextPoller_Role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    local.common_tags,
    {
      Name = "Context Poller Lambda Role"
    }
  )
}

# IAM Policy for Context Poller Lambda
resource "aws_iam_role_policy" "context_poller_lambda" {
  name = "TrialScout_ContextPoller_Policy"
  role = aws_iam_role.context_poller_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/TrialScout_ContextPoller:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.patient_profiles.arn
      }
    ]
  })
}

# Output the role ARN
output "context_poller_lambda_role_arn" {
  description = "ARN of the Context Poller Lambda IAM role"
  value       = aws_iam_role.context_poller_lambda.arn
}
