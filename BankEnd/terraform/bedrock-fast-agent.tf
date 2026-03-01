# ============================================================================
# AWS Bedrock Agent - Trial-Scout Fast Agent (Single Agent - No Supervisor)
# ============================================================================
# This is a temporary fast agent that combines Supervisor + Clinical Specialist
# functionality into a single agent to avoid multi-agent routing overhead.
# Saves 3-5 seconds compared to the multi-agent setup.
# ============================================================================

# IAM Role for Fast Agent
resource "aws_iam_role" "bedrock_fast_agent" {
  name = "AmazonBedrockExecutionRoleForAgents_Fast"
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
    Name        = "Bedrock Fast Agent Execution Role"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Attach the managed policy to the Fast Agent role
resource "aws_iam_role_policy_attachment" "bedrock_fast_agent_inference" {
  role       = aws_iam_role.bedrock_fast_agent.name
  policy_arn = data.aws_iam_policy.bedrock_agent_inference_policy.arn
}

# Inline policy for Haiku 4.5 access
resource "aws_iam_role_policy" "bedrock_fast_agent_haiku_45" {
  name = "BedrockHaiku45Access"
  role = aws_iam_role.bedrock_fast_agent.id

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

# Inline policy for inference profile access
resource "aws_iam_role_policy" "bedrock_fast_agent_inference_profile" {
  name = "BedrockInferenceProfileAccess"
  role = aws_iam_role.bedrock_fast_agent.id

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

# Inline policy for Lambda invocation (ClinicalTrialsSearch action)
resource "aws_iam_role_policy" "bedrock_fast_agent_lambda" {
  name = "BedrockLambdaInvoke"
  role = aws_iam_role.bedrock_fast_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.clinicaltrialgov_api.arn
        ]
      }
    ]
  })
}

# Fast Agent (Single Agent - No Supervisor)
resource "aws_bedrockagent_agent" "trial_scout_fast" {
  agent_name              = "TrialScout_Fast"
  agent_resource_role_arn = aws_iam_role.bedrock_fast_agent.arn
  idle_session_ttl_in_seconds = 600
  prepare_agent           = true
  agent_collaboration     = "DISABLED"
  
  # Foundation Model - Claude Haiku 4.5 via Global Inference Profile
  foundation_model = "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
  
  # Memory Configuration - DISABLED for speed
  # memory_configuration {
  #   enabled_memory_types = ["SESSION_SUMMARY"]
  #   storage_days         = 30
  # }
  
  # Fast Agent Instructions (combines Supervisor + Clinical Specialist)
  instruction = <<-EOF
    You are Trial-Scout's clinical trial search assistant. Search for clinical trials and return results.
    
    WORKFLOW:
    1. If user provides medical condition → immediately call ClinicalTrialsSearch(condition, status="RECRUITING", pageSize=5)
    2. If missing condition → ask "What medical condition are you searching for?"
    3. For greetings → reply politely and briefly
    
    OUTPUT: Return plain text with trial details in this format:
    
    Here are X clinical trials for [condition]:
    
    1. **Trial Name**
    - NCT ID: NCT12345
    - Status: RECRUITING
    - Summary: Brief description
    
    2. **Trial Name**
    - NCT ID: NCT67890
    - Status: RECRUITING
    - Summary: Brief description
    
    Keep responses concise and focused on trial information.
  EOF

  tags = {
    Name        = "Trial-Scout Fast Agent"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
    Purpose     = "Temporary fast single-agent solution"
  }
  
  depends_on = [
    aws_iam_role_policy.bedrock_fast_agent_haiku_45,
    aws_iam_role_policy.bedrock_fast_agent_inference_profile,
    aws_iam_role_policy_attachment.bedrock_fast_agent_inference
  ]
}

# Attach ClinicalTrialsSearch action group to Fast Agent
resource "aws_bedrockagent_agent_action_group" "fast_clinical_trials_search" {
  action_group_name          = "ClinicalTrialsSearch"
  agent_id                   = aws_bedrockagent_agent.trial_scout_fast.agent_id
  agent_version              = "DRAFT"
  skip_resource_in_use_check = true
  
  action_group_executor {
    lambda = aws_lambda_function.clinicaltrialgov_api.arn
  }
  
  api_schema {
    payload = jsonencode({
      openapi = "3.0.0"
      info = {
        title       = "Clinical Trials Search API"
        version     = "1.0.0"
        description = "API for searching clinical trials from ClinicalTrials.gov"
      }
      paths = {
        "/searchClinicalTrials" = {
          post = {
            summary     = "Search for clinical trials"
            description = "Search for clinical trials based on various parameters including condition, term, location, age, and status"
            operationId = "searchClinicalTrials"
            requestBody = {
              required = true
              content = {
                "application/json" = {
                  schema = {
                    type = "object"
                    properties = {
                      condition = {
                        type        = "string"
                        description = "Medical condition or disease (e.g., 'Multiple Sclerosis', 'Diabetes', 'Cancer')"
                      }
                      term = {
                        type        = "string"
                        description = "Additional search terms (e.g., drug name, therapy type, biomarker)"
                      }
                      location = {
                        type        = "string"
                        description = "Geographic location (e.g., 'New York', 'California', 'United States')"
                      }
                      age = {
                        type        = "integer"
                        description = "Patient age in years"
                      }
                      status = {
                        type        = "string"
                        description = "Trial recruitment status"
                        enum        = ["RECRUITING", "ACTIVE_NOT_RECRUITING", "COMPLETED", "SUSPENDED", "TERMINATED", "WITHDRAWN"]
                        default     = "RECRUITING"
                      }
                      pageSize = {
                        type        = "integer"
                        description = "Number of results to return (1-100)"
                        minimum     = 1
                        maximum     = 100
                        default     = 5
                      }
                    }
                  }
                }
              }
            }
            responses = {
              "200" = {
                description = "Successful response with clinical trials"
                content = {
                  "application/json" = {
                    schema = {
                      type = "object"
                      properties = {
                        trials = {
                          type = "array"
                          items = {
                            type = "object"
                            properties = {
                              nct_id = {
                                type        = "string"
                                description = "NCT identifier"
                              }
                              trial_name = {
                                type        = "string"
                                description = "Official trial title"
                              }
                              status = {
                                type        = "string"
                                description = "Recruitment status"
                              }
                              summary = {
                                type        = "string"
                                description = "Brief trial description"
                              }
                              location = {
                                type        = "string"
                                description = "Trial location"
                              }
                            }
                          }
                        }
                        count = {
                          type        = "integer"
                          description = "Number of trials returned"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}

# Lambda permission for Fast Agent to invoke ClinicalTrials API
resource "aws_lambda_permission" "bedrock_fast_invoke_clinical_trial_lambda" {
  statement_id  = "AllowBedrockFastAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.clinicaltrialgov_api.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.trial_scout_fast.agent_arn
}

# Output the Fast Agent details
output "bedrock_fast_agent_id" {
  description = "ID of the Bedrock Fast Agent"
  value       = aws_bedrockagent_agent.trial_scout_fast.agent_id
}

output "bedrock_fast_agent_arn" {
  description = "ARN of the Bedrock Fast Agent"
  value       = aws_bedrockagent_agent.trial_scout_fast.agent_arn
}

output "bedrock_fast_agent_name" {
  description = "Name of the Bedrock Fast Agent"
  value       = aws_bedrockagent_agent.trial_scout_fast.agent_name
}

output "bedrock_fast_agent_role_arn" {
  description = "ARN of the Fast Agent execution role"
  value       = aws_iam_role.bedrock_fast_agent.arn
}
