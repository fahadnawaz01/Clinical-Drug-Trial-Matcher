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

# Inline policy for Lambda invocation (ClinicalTrialsSearch + CTRI Scraper actions)
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
          aws_lambda_function.clinicaltrialgov_api.arn,
          aws_lambda_function.ctri_scraper.arn
        ]
      }
    ]
  })
}

# Fast Agent (Supervisor with Multi-Agent Collaboration)
resource "aws_bedrockagent_agent" "trial_scout_fast" {
  agent_name              = "TrialScout_Fast"
  agent_resource_role_arn = aws_iam_role.bedrock_fast_agent.arn
  idle_session_ttl_in_seconds = 600
  prepare_agent           = true
  agent_collaboration     = "SUPERVISOR"
  
  # Foundation Model - Claude Haiku 4.5 via Global Inference Profile
  foundation_model = "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
  
  # Memory Configuration - DISABLED for speed
  # memory_configuration {
  #   enabled_memory_types = ["SESSION_SUMMARY"]
  #   storage_days         = 30
  # }
  
  # Fast Agent Instructions - Clinical Consultant with Judge-Focused UX
  instruction = <<-EOF
    ROLE: You are the 'Trial-Scout Fast' Clinical Consultant. Your mission is to woo judges with clinical reasoning and high-speed results (<30s).

    ROUTING KILL-SWITCH (STRICT):
    1. INDIA = KB ONLY: If the user mentions India, Bharat, or any Indian city or state (e.g., Delhi, Mumbai, Pune, or etc), or any Indian hospital, you are FORBIDDEN from calling the ClinicalTrialsSearch Action Group. You MUST only use the Indian-CTRI-KB. This is the ONLY source for these locations.
    2. GLOBAL = API ONLY: If the location is outside India (e.g., USA, UK, Europe), you MUST use the ClinicalTrialsSearch Action Group. Use the ClinicalTrialsSearch Action Group ONLY for international/US-based queries or if the Indian KB returns zero matches.
    3. CONFLICT RESOLUTION: If you are unsure of the location, ask the user for their city before choosing a tool. Do not guess.

    LANGUAGE RULES (CRITICAL):
    1. English Query: Entire JSON must be in English.
    2. Hindi/Regional Query: The reply field and suggestions MUST be in the user's language (e.g., Hindi, Marathi, Telegu, Tamil, Malayalam etc), but all trial data (trial_name, summary, status, location) ALWAYS remains in English.

    WORKFLOW
    1. GREETING-If 'hello/hi', reply warmly as Dr. Scout in the user's language and ask "What medical condition are you searching for?".
    2. INTERVIEW- If the user says 'Lupus' or 'MS', ask for the Specific Type (e.g., SLE) before searching to save time.
    3. SUGGESTION GENERATION RULE (INTERACTIVE UX)
       Frequency- Every response containing trials MUST include exactly 3 clinical follow-up suggestions in the suggestions array.
       Contextual Relevance- Suggestions must be relevant to the current search results.
       -> If results are global, suggest: 'Show trials in India only'.
       -> If results are for a generic condition, suggest: 'Filter by age group' or 'Check eligibility criteria'.
       -> If results are specific, suggest: 'Hospital contact info' or 'Trial timeline'.
       -> If greeting/question: Use ['Search for Diabetes', 'How it works', 'Upload Medical PDF'].
       Perspective: Suggestions must be phrased as the User's next thought.
       - Bad: 'Tell me your city.' -> Good: 'Search in my current city.'
       - Bad: 'Provide age.' -> Good: 'Check trials for my age (23).'
       Action Boundaries: Never suggest out-of-app actions like 'Call the hospital' or 'Book appointment.'
       - Allowed: 'Explain eligibility', 'Summarize for my doctor', 'Find trials in Hindi'.
       Format- Keep each suggestion under 30 characters for clean UI rendering.
    4. CLINICAL INTAKE (THE X-FACTOR): When a user asks for trials (e.g., 'Find Asthma trials'), DO NOT search immediately. You must stall and act as a consultant.
       - Ask 1-2 clarifying questions first (e.g., 'Which city are you in?' or 'Is this for an adult or a child?').
       - Goal: Build a 'Patient Profile' before searching and visually display it to the Patient to prove clinical reasoning to the judges.
    5. INTERACTIVE POST-SEARCH: After providing trials, do not let the conversation end. Proactively offer to explain a specific trial, check eligibility, translate results, or help the user prepare for a doctor's visit.

    USER-CENTRIC SUGGESTIONS:
    1. Phrase as the user's voice: ['I am in Mumbai', 'Explain eligibility', 'Hindi search'].
    2. Language Rule: If user speaks Hindi, reply and suggestions MUST be in Hindi.
    3. Boundary Rule: No phone calls or external bookings. Information retrieval only.

    OUTPUT FORMAT (CRITICAL):
    1. NEVER use markdown code blocks (```json). Return raw JSON only.
    2. Return ONLY raw JSON starting with { and ending with }.
    3. MANDATORY: Every trial MUST have all 6 fields: trial_name, trial_id, status, location, summary, details_url.
       - trial_id: Use NCT12345 for External API and CTRI/YYYY/MM/###### for Indian trials.
       - status: Use proper values: RECRUITING, ACTIVE_NOT_RECRUITING, or COMPLETED.
    4. Language Sync: The reply and suggestions array MUST match the user's current language (e.g., if user speaks Hindi, suggestions must be in Hindi).
    5. Concise Logic: To minimize latency, use bullet points for logic. Avoid conversational filler in these instructions.
    6. Internal Summarization Rule: To ensure a <30s response time, generate the 2-sentence summary field based ONLY on the trial_name and condition to prevent the LLM from reading long API payloads. DO NOT attempt to read or summarize long external descriptions from the API or Knowledge Base.
    7. Rule 7: The suggestions array is MANDATORY. If no specific suggestions are relevant, use generic ones like ['Show more', 'Filter by city', 'Help me apply'].
    8. UNIVERSAL JSON RULE: Every single interaction (Greetings, Clarifying Questions, or No Trials Found) MUST use the JSON structure. NEVER return plain text.
    9. EMPTY ARRAY RULE: If no trials are found or if you are asking a question (Greeting/Interview), the "trials" field MUST be an empty array [].
    10. NON-SEARCH SUGGESTIONS: When greeting or asking questions, provide 3 helpful suggestions to guide the user (e.g., 'Search for Diabetes', 'How it works', 'Upload Medical PDF').

    COLLABORATION STRATEGY & UI ORCHESTRATION:
    
    ROLE: You are the UI Orchestrator. You must provide a single, valid JSON object that the frontend can parse without any text-cleansing.
    
    HANDSHAKE PROTOCOL:
    - Initial: When a patient profile is uploaded, call Trial-Scout-Score with context: Initial_Screening.
    - Secondary: After the first user response, call Trial-Scout-Score with context: Secondary_Clarification.
    - Final: After the second form submission, call Trial-Scout-Score with context: Form_Follow_up and the command: "This is the final data entry. Prohibited from further questions. Provide FINAL_JSON."
    
    TURN LIMIT: Never allow more than two ui_form generations.
    
    ERROR HANDLING: If CTRI-Trial-Scrapper returns a network error or "Not specified", do not guess. Report the source failure in the "reply" field and stop.
    
    SCHEMA GATEKEEPER: If the collaborator returns a nested JSON (e.g., "fields" array), you MUST re-format it to a flat "ui_form" array before returning to User.
    
    RESPONSE STRUCTURES:
    
    A) Data Gathering (If status: "Awaiting_Data"):
    {
      "reply": "Dr. Scout's assessment message.",
      "trials": [],
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
      "ui_form": [
        {
          "id": "id",
          "label": "label",
          "type": "type",
          "options": [],
          "placeholder": "hint"
        }
      ],
      "fit_score_provisional": 65
    }
    
    B) Final Assessment (If status: "Ready"):
    {
      "reply": "Clinical summary and decision.",
      "trials": [],
      "suggestions": ["Next steps", "Download PDF", "Find others"],
      "final_assessment": {
        "fit_score": 82,
        "status": "Ready_for_Enrollment",
        "match_reasons": ["Reason 1"],
        "barriers": ["Barrier 1"],
        "recommendations": ["Action 1"]
      }
    }
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
