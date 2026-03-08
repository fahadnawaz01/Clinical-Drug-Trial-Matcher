# ============================================================================
# IAM User for Agent Tuning - Limited Bedrock Access
# ============================================================================
# This user can only view and edit Bedrock Agents (except production agent)
# and view CloudWatch logs for debugging. No access to other AWS services.
# ============================================================================

# IAM User for Agent Tuner
resource "aws_iam_user" "agent_tuner" {
  name = "agent-tuner"
  path = "/trial-scout/"

  tags = {
    Name        = "Agent Tuner User"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Purpose     = "Limited access for agent optimization"
    Environment = "Production"
  }
}

# IAM Policy for Agent Tuner - Bedrock Agent Access
resource "aws_iam_policy" "agent_tuner_bedrock_access" {
  name        = "TrialScout_AgentTuner_BedrockAccess"
  path        = "/trial-scout/"
  description = "Allows viewing and editing Bedrock Agents (except production) and viewing Knowledge Bases"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowListAgents"
        Effect = "Allow"
        Action = [
          "bedrock:ListAgents",
          "bedrock:GetAgent",
          "bedrock:ListAgentVersions",
          "bedrock:ListAgentActionGroups",
          "bedrock:GetAgentActionGroup",
          "bedrock:ListAgentKnowledgeBases",
          "bedrock:GetAgentKnowledgeBase"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowUpdateTestAgents"
        Effect = "Allow"
        Action = [
          "bedrock:UpdateAgent",
          "bedrock:PrepareAgent",
          "bedrock:UpdateAgentActionGroup",
          "bedrock:UpdateAgentKnowledgeBase"
        ]
        Resource = [
          "arn:aws:bedrock:ap-south-1:262530697266:agent/*"
        ]
        Condition = {
          StringNotEquals = {
            "bedrock:AgentId" = "HSWNG5TAJH"  # Production agent - PROTECTED
          }
        }
      },
      {
        Sid    = "AllowInvokeAgentForTesting"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeAgent"
        ]
        Resource = [
          "arn:aws:bedrock:ap-south-1:262530697266:agent/*"
        ]
      },
      {
        Sid    = "AllowViewKnowledgeBases"
        Effect = "Allow"
        Action = [
          "bedrock:ListKnowledgeBases",
          "bedrock:GetKnowledgeBase",
          "bedrock:ListDataSources",
          "bedrock:GetDataSource"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowViewFoundationModels"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel",
          "bedrock:ListInferenceProfiles",
          "bedrock:GetInferenceProfile"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyDeleteOperations"
        Effect = "Deny"
        Action = [
          "bedrock:DeleteAgent",
          "bedrock:DeleteAgentVersion",
          "bedrock:DeleteAgentActionGroup",
          "bedrock:DeleteAgentKnowledgeBase",
          "bedrock:DeleteKnowledgeBase",
          "bedrock:DeleteDataSource"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "Agent Tuner Bedrock Access Policy"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# IAM Policy for Agent Tuner - CloudWatch Logs Read Access
resource "aws_iam_policy" "agent_tuner_cloudwatch_access" {
  name        = "TrialScout_AgentTuner_CloudWatchAccess"
  path        = "/trial-scout/"
  description = "Allows viewing CloudWatch logs for Bedrock Agents debugging"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewCloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = [
          "arn:aws:logs:ap-south-1:262530697266:log-group:/aws/bedrock/agent/*",
          "arn:aws:logs:ap-south-1:262530697266:log-group:/aws/bedrock/knowledge-base/*"
        ]
      },
      {
        Sid    = "AllowListLogGroups"
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "Agent Tuner CloudWatch Access Policy"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# IAM Policy for Console Access
resource "aws_iam_policy" "agent_tuner_console_access" {
  name        = "TrialScout_AgentTuner_ConsoleAccess"
  path        = "/trial-scout/"
  description = "Allows basic AWS Console access for navigation"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowConsoleAccess"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowChangeOwnPassword"
        Effect = "Allow"
        Action = [
          "iam:ChangePassword",
          "iam:GetUser"
        ]
        Resource = "arn:aws:iam::262530697266:user/trial-scout/agent-tuner"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ResyncMFADevice",
          "iam:ListMFADevices",
          "iam:GetUser"
        ]
        Resource = [
          "arn:aws:iam::262530697266:user/trial-scout/agent-tuner",
          "arn:aws:iam::262530697266:mfa/agent-tuner"
        ]
      },
      {
        Sid    = "AllowListVirtualMFADevices"
        Effect = "Allow"
        Action = [
          "iam:ListVirtualMFADevices"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "Agent Tuner Console Access Policy"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Attach Bedrock Access Policy to User
resource "aws_iam_user_policy_attachment" "agent_tuner_bedrock" {
  user       = aws_iam_user.agent_tuner.name
  policy_arn = aws_iam_policy.agent_tuner_bedrock_access.arn
}

# Attach CloudWatch Access Policy to User
resource "aws_iam_user_policy_attachment" "agent_tuner_cloudwatch" {
  user       = aws_iam_user.agent_tuner.name
  policy_arn = aws_iam_policy.agent_tuner_cloudwatch_access.arn
}

# Attach Console Access Policy to User
resource "aws_iam_user_policy_attachment" "agent_tuner_console" {
  user       = aws_iam_user.agent_tuner.name
  policy_arn = aws_iam_policy.agent_tuner_console_access.arn
}

# Create Login Profile (Console Password)
resource "aws_iam_user_login_profile" "agent_tuner_login" {
  user                    = aws_iam_user.agent_tuner.name
  password_reset_required = true  # User must change password on first login
}

# Output the user details
output "agent_tuner_username" {
  description = "Username for agent tuner"
  value       = aws_iam_user.agent_tuner.name
}

output "agent_tuner_arn" {
  description = "ARN of the agent tuner user"
  value       = aws_iam_user.agent_tuner.arn
}

output "agent_tuner_console_url" {
  description = "AWS Console login URL for agent tuner"
  value       = "https://262530697266.signin.aws.amazon.com/console"
}

output "agent_tuner_initial_password" {
  description = "Initial password for agent tuner (must be changed on first login)"
  value       = aws_iam_user_login_profile.agent_tuner_login.password
  sensitive   = true
}
