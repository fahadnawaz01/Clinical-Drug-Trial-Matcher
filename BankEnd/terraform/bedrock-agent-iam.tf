# ============================================================================
# Bedrock Agent IAM Role
# Execution role for the Trial-Scout Bedrock Agent
# ============================================================================

# IAM Role for Bedrock Agent
resource "aws_iam_role" "bedrock_agent" {
  name = "AmazonBedrockExecutionRoleForAgents_HCHFDKWX7RI"
  path = "/service-role/"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "bedrock.amazonaws.com"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = "262530697266"
          }
          ArnLike = {
            "aws:SourceArn" = "arn:aws:bedrock:ap-south-1:262530697266:agent/*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "Bedrock Agent Execution Role"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Reference to existing managed policy (created by AWS Console)
data "aws_iam_policy" "bedrock_agent_inference_policy" {
  arn = "arn:aws:iam::262530697266:policy/service-role/AmazonBedrockAgentInferenceProfilesCrossRegionPolicy_5GT98SF7SY2"
}

# Attach the managed policy to the role
resource "aws_iam_role_policy_attachment" "bedrock_agent_inference" {
  role       = aws_iam_role.bedrock_agent.name
  policy_arn = data.aws_iam_policy.bedrock_agent_inference_policy.arn
}

# Additional inline policy specifically for Haiku 4.5 global inference profile
resource "aws_iam_role_policy" "bedrock_agent_haiku_45" {
  name = "BedrockHaiku45Access"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetInferenceProfile",
          "bedrock:GetFoundationModel"
        ]
        Resource = [
          "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0",
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
          "arn:aws:bedrock:ap-south-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
        ]
      }
    ]
  })
}

# Inline policy for Supervisor to invoke Clinical Specialist and use Haiku 4.5
resource "aws_iam_role_policy" "bedrock_supervisor_collaboration" {
  name = "SupervisorCollaborationPolicy"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent"
        ]
        Resource = [
          "arn:aws:bedrock:ap-south-1:262530697266:agent-alias/KUGTRXKVYO/*"
        ]
      }
    ]
  })
}

# Output the role ARN
output "bedrock_agent_role_arn" {
  description = "ARN of the Bedrock Agent execution role"
  value       = aws_iam_role.bedrock_agent.arn
}

output "bedrock_agent_role_name" {
  description = "Name of the Bedrock Agent execution role"
  value       = aws_iam_role.bedrock_agent.name
}

# Inline policy for invoking Action Group Lambda functions
resource "aws_iam_role_policy" "bedrock_agent_lambda_invoke" {
  name = "ActionGroupLambdaInvokePolicy"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          "arn:aws:lambda:ap-south-1:262530697266:function:clinicaltrialgov-fetcher"
        ]
      }
    ]
  })
}
