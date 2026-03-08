# ============================================================================
# Bedrock Agent Action Group - CTRI Trial Scraper
# Attaches the CTRI scraper Lambda to the Clinical Specialist Agent
# ============================================================================

# Lambda Permission for Clinical Specialist Agent to invoke CTRI Scraper
resource "aws_lambda_permission" "bedrock_clinical_specialist_invoke_ctri_scraper" {
  statement_id  = "AllowClinicalSpecialistAgentInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ctri_scraper.function_name
  principal     = "bedrock.amazonaws.com"
  source_arn    = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_arn
}

# IAM Policy for Clinical Specialist to invoke CTRI Scraper Lambda
resource "aws_iam_role_policy" "bedrock_clinical_specialist_lambda" {
  name = "BedrockClinicalSpecialistLambdaInvoke"
  role = aws_iam_role.bedrock_clinical_specialist.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = [
          aws_lambda_function.ctri_scraper.arn
        ]
      }
    ]
  })
}

# Action Group for CTRI Trial Scraper
resource "aws_bedrockagent_agent_action_group" "clinical_specialist_ctri_scraper" {
  action_group_name          = "CTRI_trial"
  agent_id                   = aws_bedrockagent_agent.trial_scout_clinical_specialist.agent_id
  agent_version              = "DRAFT"
  skip_resource_in_use_check = false
  
  action_group_executor {
    lambda = aws_lambda_function.ctri_scraper.arn
  }

  # OpenAPI Schema for the CTRI Scraper Action Group
  api_schema {
    payload = jsonencode({
      openapi = "3.0.0"
      info = {
        title       = "CTRI Trial Scraper API"
        version     = "1.0.0"
        description = "API for scraping clinical trial data from CTRI (Clinical Trials Registry - India)"
      }
      paths = {
        "/scrapeCTRITrial" = {
          get = {
            summary     = "Scrape CTRI trial data"
            description = "Scrape specific modules of data from a CTRI trial page. Use requestedModules to specify which data sections to retrieve."
            operationId = "CTRI-Trial-Scrapper"
            parameters = [
              {
                name        = "trialUrl"
                in          = "query"
                required    = true
                schema = {
                  type = "string"
                }
                description = "Full URL of the CTRI trial page (e.g., 'https://ctri.nic.in/Clinicaltrials/pmaindet2.php?EncHid=...')"
              },
              {
                name        = "requestedModules"
                in          = "query"
                required    = true
                schema = {
                  type = "array"
                  items = {
                    type = "string"
                    enum = ["SUMMARY", "ELIGIBILITY", "CONTACTS", "LOCATIONS", "STUDY_SPECS"]
                  }
                  minItems = 1
                }
                description = "List of data modules to scrape. For medical pre-screening, use ['ELIGIBILITY'] to get inclusion/exclusion criteria."
              }
            ]
            responses = {
              "200" = {
                description = "Successful response with scraped trial data"
                content = {
                  "application/json" = {
                    schema = {
                      type = "object"
                      properties = {
                        trialUrl = {
                          type        = "string"
                          description = "The CTRI trial URL that was scraped"
                        }
                        scrapedAt = {
                          type        = "string"
                          description = "Timestamp of when the data was scraped"
                        }
                        modules = {
                          type        = "object"
                          description = "Scraped data organized by module"
                          properties = {
                            ELIGIBILITY = {
                              type = "object"
                              properties = {
                                inclusion = {
                                  type        = "string"
                                  description = "Inclusion criteria for the trial"
                                }
                                exclusion = {
                                  type        = "string"
                                  description = "Exclusion criteria for the trial"
                                }
                                ageFrom = {
                                  type        = "string"
                                  description = "Minimum age requirement"
                                }
                                ageTo = {
                                  type        = "string"
                                  description = "Maximum age requirement"
                                }
                                gender = {
                                  type        = "string"
                                  description = "Gender requirements (Male/Female/Both)"
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
            }
          }
        }
      }
    })
  }

  depends_on = [
    aws_lambda_permission.bedrock_clinical_specialist_invoke_ctri_scraper,
    aws_iam_role_policy.bedrock_clinical_specialist_lambda
  ]
}

# Output the Action Group details
output "clinical_specialist_ctri_action_group_id" {
  description = "ID of the CTRI Scraper Action Group for Clinical Specialist"
  value       = aws_bedrockagent_agent_action_group.clinical_specialist_ctri_scraper.action_group_id
}

output "clinical_specialist_ctri_action_group_name" {
  description = "Name of the CTRI Scraper Action Group for Clinical Specialist"
  value       = aws_bedrockagent_agent_action_group.clinical_specialist_ctri_scraper.action_group_name
}
