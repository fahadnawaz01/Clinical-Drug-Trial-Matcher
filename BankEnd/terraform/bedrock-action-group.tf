# ============================================================================
# Bedrock Agent Action Group - ClinicalTrialsSearch
# Attaches the clinicaltrialgov-api-lambda to the Clinical Specialist Agent
# ============================================================================

# Lambda Permission for Bedrock Agent to invoke the Lambda
resource "aws_lambda_permission" "bedrock_invoke_clinical_trial_lambda" {
  statement_id  = "AllowBedrockAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = "clinicaltrialgov-api-lambda"
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_arn
}

# Action Group for Clinical Trials Search
resource "aws_bedrockagent_agent_action_group" "clinical_trials_search" {
  action_group_name          = "ClinicalTrialsSearch"
  agent_id                   = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_id
  agent_version              = "DRAFT"
  skip_resource_in_use_check = false
  
  action_group_executor {
    lambda = "arn:aws:lambda:ap-south-1:262530697266:function:clinicaltrialgov-api-lambda"
  }

  # OpenAPI Schema for the Action Group
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

  depends_on = [
    aws_lambda_permission.bedrock_invoke_clinical_trial_lambda
  ]
}

# Output the Action Group details
output "clinical_trials_action_group_id" {
  description = "ID of the Clinical Trials Search Action Group"
  value       = aws_bedrockagent_agent_action_group.clinical_trials_search.action_group_id
}

output "clinical_trials_action_group_name" {
  description = "Name of the Clinical Trials Search Action Group"
  value       = aws_bedrockagent_agent_action_group.clinical_trials_search.action_group_name
}
