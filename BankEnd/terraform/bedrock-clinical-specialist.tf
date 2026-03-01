# ============================================================================
# AWS Bedrock Agent - Trial-Scout Clinical Specialist Sub-Agent
# ============================================================================

# IAM Role for Clinical Specialist Agent
resource "aws_iam_role" "bedrock_clinical_specialist" {
  name = "AmazonBedrockExecutionRoleForAgents_ClinicalSpecialist"
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
    Name        = "Bedrock Clinical Specialist Execution Role"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Attach the managed policy to the Clinical Specialist role
resource "aws_iam_role_policy_attachment" "bedrock_clinical_specialist_inference" {
  role       = aws_iam_role.bedrock_clinical_specialist.name
  policy_arn = data.aws_iam_policy.bedrock_agent_inference_policy.arn
}

# Additional inline policy specifically for Haiku 4.5 global inference profile
resource "aws_iam_role_policy" "bedrock_clinical_specialist_haiku_45" {
  name = "BedrockHaiku45Access"
  role = aws_iam_role.bedrock_clinical_specialist.id

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

# Inline policy for Claude Haiku 4.5 via inference profile
resource "aws_iam_role_policy" "bedrock_clinical_specialist_inference_profile" {
  name = "BedrockInferenceProfileAccess"
  role = aws_iam_role.bedrock_clinical_specialist.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetInferenceProfile"
        ]
        Resource = [
          "arn:aws:bedrock:*:262530697266:inference-profile/*",
          "arn:aws:bedrock:*::foundation-model/*"
        ]
      }
    ]
  })
}

# Clinical Specialist Agent
resource "aws_bedrockagent_agent" "trial_scout_clinical_specialist" {
  agent_name              = "TrialScout_ClinicalSpecialist"
  agent_resource_role_arn = aws_iam_role.bedrock_clinical_specialist.arn
  idle_session_ttl_in_seconds = 600
  prepare_agent           = true
  agent_collaboration     = "DISABLED"
  
  # Foundation Model - Claude Haiku 4.5 via Global Inference Profile (fastest, better quality)
  foundation_model = "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
  
  # Memory Configuration - DISABLED for testing
  # memory_configuration {
  #   enabled_memory_types = ["SESSION_SUMMARY"]
  #   storage_days         = 30
  # }
  
  # Clinical Specialist Instructions (Haiku 4.5 - ultra-fast, JSON only)
  instruction = <<-EOF
    Clinical trial search specialist. Return ONLY valid JSON.
    
    WORKFLOW:
    1. If user provides condition → immediately call ClinicalTrialsSearch(condition, status="RECRUITING", pageSize=5)
    2. If missing condition → ask "What medical condition?" (JSON format)
    3. Return results in JSON format
    
    JSON FORMATS:
    
    With trials:
    {"reply":"Found 5 trials","trials":[{"trial_name":"Name","nct_id":"NCT123","status":"RECRUITING","summary":"Description"}]}
    
    Need info:
    {"reply":"What medical condition are you searching for?"}
    
    No trials:
    {"reply":"No trials found"}
    
    CRITICAL: Output MUST be valid JSON starting with { and ending with }. No markdown, no explanations, no extra text.
  EOF

  tags = {
    Name        = "Trial-Scout Clinical Specialist Agent"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Output the Clinical Specialist agent details
output "bedrock_clinical_specialist_agent_id" {
  description = "ID of the Bedrock Clinical Specialist Agent"
  value       = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_id
}

output "bedrock_clinical_specialist_agent_arn" {
  description = "ARN of the Bedrock Clinical Specialist Agent"
  value       = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_arn
}

output "bedrock_clinical_specialist_agent_name" {
  description = "Name of the Bedrock Clinical Specialist Agent"
  value       = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_name
}

output "bedrock_clinical_specialist_role_arn" {
  description = "ARN of the Clinical Specialist execution role"
  value       = aws_iam_role.bedrock_clinical_specialist.arn
}
