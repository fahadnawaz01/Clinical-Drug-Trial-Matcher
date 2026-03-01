# ============================================================================
# Trial-Scout Infrastructure - Main Configuration
# ============================================================================

# IAM Roles Module (must be created first)
module "iam" {
  source = "./modules/iam"

  ui_agent_role_name              = "ui-agent-middlelayer-role-vyybgke5"
  clinical_trial_role_name        = "clinicaltrialgov-api-lambda-role-5vkf0niy"

  tags = local.common_tags
}

# Lambda Functions Module
module "lambda" {
  source = "./modules/lambda"

  ui_agent_function_name              = "ui-agent-middlelayer"
  ui_agent_role_arn                   = module.iam.ui_agent_role_arn
  ui_agent_timeout                    = 60
  ui_agent_memory_size                = 256
  ui_agent_environment_variables      = {
    AGENT_ID = aws_bedrockagent_agent.trial_scout_fast.agent_id
  }

  clinical_trial_function_name        = "clinicaltrialgov-api-lambda"
  clinical_trial_role_arn             = module.iam.clinical_trial_role_arn
  clinical_trial_timeout              = 15
  clinical_trial_memory_size          = 128

  tags = local.common_tags
}

# API Gateway Module
module "api_gateway" {
  source = "./modules/api-gateway"

  api_name            = "Drug-Trial-matches"
  api_description     = "API Gateway for drug trial matcher"
  stage_name          = "drug-trial-matcher"

  tags = local.common_tags
}

# S3 Bucket Module for Medical Documents
module "s3_medical_documents" {
  source = "./modules/s3"

  bucket_name     = "${var.project_name_lower}-medical-documents-${var.aws_region}"
  allowed_origins = var.cors_allowed_origins

  tags = local.common_tags
}
