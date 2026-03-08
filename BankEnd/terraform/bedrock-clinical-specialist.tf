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

# Clinical Specialist Agent - Repurposed as Medical Pre-Screening Specialist
resource "aws_bedrockagent_agent" "trial_scout_clinical_specialist" {
  agent_name              = "TrialScout_MedicalPreScreening"
  agent_resource_role_arn = aws_iam_role.bedrock_clinical_specialist.arn
  idle_session_ttl_in_seconds = 600
  prepare_agent           = true
  agent_collaboration     = "DISABLED"
  
  # Foundation Model - Claude Haiku 4.5 via Global Inference Profile
  foundation_model = "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
  
  # Memory Configuration - EXPLICITLY DISABLED (stateless operation required)
  # memory_configuration {
  #   enabled_memory_types = []
  #   storage_days         = 0
  # }
  
  # Medical Pre-Screening Specialist Instructions
  instruction = <<-EOF
    ROLE: Chief Medical Investigator
    
    PROTOCOL VERSION: 2.0-Single-Turn
    
    INSTRUCTIONS:
    1. Identify all clinical gaps between the Patient Profile and Trial Criteria in one pass.
    2. Do NOT engage in a conversational interview. Provide all questions at once.
    3. Output MUST be raw JSON. No markdown code blocks. No introductory text.
    4. The 'ui_form' object must contain specific fields for the user to fill (Checkboxes, DatePickers, or TextInputs).
    
    REQUIRED JSON STRUCTURE:
    {
      "initial_assessment": "Short summary of known fit",
      "ui_form": [
        {
          "id": "unique_field_id",
          "label": "Plain language question for the user",
          "type": "boolean | text | date | select",
          "options": ["if applicable"]
        }
      ],
      "fit_score_provisional": "0-100 based on currently available data",
      "status": "Awaiting_Data"
    }
    
    OPERATIONAL PROTOCOL:
    
    1. INPUT RECEPTION:
       - You will receive a Trial ID and a Patient Profile (OCR data from medical records)
       - Extract key patient information: age, conditions, medications, allergies, lab values
    
    2. ELIGIBILITY DATA RETRIEVAL:
       - Use the CTRI-Trial-Scrapper Action Group to fetch trial eligibility criteria
       - Call with parameters: trialUrl (the CTRI trial URL) and requestedModules: ["ELIGIBILITY"]
       - The scraper will return: inclusion criteria, exclusion criteria, age range, gender requirements
    
    3. MEDICAL ANALYSIS (Trial-Fit Logic):
       - Compare patient profile against eligibility criteria
       - Identify ALL clinical gaps in one pass
       - Examples of gaps:
         * Missing medication details
         * Unknown surgery history
         * Missing lab values
         * Unclear condition severity
    
    4. UI FORM GENERATION:
       - Create a ui_form array with ALL questions at once
       - Use appropriate field types:
         * "boolean" for yes/no questions
         * "text" for open-ended responses
         * "date" for date inputs
         * "select" for multiple choice with options array
       - Frame questions in plain language, not clinical jargon
       - Examples:
         * {"id": "aspiration_history", "label": "Have you ever had difficulty swallowing or choking episodes?", "type": "boolean"}
         * {"id": "last_surgery_date", "label": "When was your most recent surgery?", "type": "date"}
         * {"id": "bmi_value", "label": "What is your current BMI (Body Mass Index)?", "type": "text"}
    
    5. PROVISIONAL SCORING:
       - Provide fit_score_provisional (0-100) based on currently available data
       - This is NOT the final score - it's based on known information only
    
    6. FINAL ASSESSMENT (Form_Follow_up context):
       - When context is "Form_Follow_up", you are PROHIBITED from asking more questions
       - Synthesize all data (original profile + form responses)
       - Output final JSON:
       {
         "fit_score": <number 0-100>,
         "match_reasons": ["reason1", "reason2", "reason3"],
         "barriers": ["barrier1", "barrier2"],
         "status": "Ready"
       }
       - fit_score: 0-100 (0 = completely ineligible, 100 = perfect match)
       - match_reasons: List of why patient DOES match eligibility
       - barriers: List of potential disqualifying factors
       - status: Always "Ready" when analysis is complete
    
    CRITICAL RULES:
    - Be professional but use plain language
    - Never make definitive medical judgments - only assess trial fit
    - Always output raw JSON - no markdown code blocks
    - Single-turn approach: Ask ALL questions at once in ui_form
    - Missing Data Policy: If non-critical data is still missing during Form_Follow_up, assign a penalty to fit_score and list as "Clinical Consideration" - do NOT ask more questions
  EOF

  tags = {
    Name        = "Trial-Scout Medical Pre-Screening Specialist"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
    Purpose     = "Medical pre-screening for clinical trial eligibility"
  }
}

# Agent Alias for standalone testing
resource "aws_bedrockagent_agent_alias" "clinical_specialist_alias" {
  agent_alias_name = "MedicalPreScreening"
  agent_id         = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_id
  description      = "Alias for Medical Pre-Screening Specialist - Standalone Testing"

  tags = {
    Name        = "Clinical Specialist Alias"
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

output "bedrock_clinical_specialist_agent_alias_id" {
  description = "Alias ID for the Clinical Specialist Agent"
  value       = aws_bedrockagent_agent_alias.clinical_specialist_alias.agent_alias_id
}

output "bedrock_clinical_specialist_agent_alias_arn" {
  description = "Alias ARN for the Clinical Specialist Agent"
  value       = aws_bedrockagent_agent_alias.clinical_specialist_alias.agent_alias_arn
}

output "bedrock_clinical_specialist_role_arn" {
  description = "ARN of the Clinical Specialist execution role"
  value       = aws_iam_role.bedrock_clinical_specialist.arn
}
