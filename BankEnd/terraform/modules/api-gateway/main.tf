# ============================================================================
# API Gateway REST API
# ============================================================================

resource "aws_api_gateway_rest_api" "drug_trial_matches" {
  name                         = var.api_name
  description                  = var.api_description
  api_key_source               = "HEADER"
  disable_execute_api_endpoint = false
  put_rest_api_mode            = "overwrite"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

resource "aws_api_gateway_deployment" "drug_trial_matcher" {
  rest_api_id = aws_api_gateway_rest_api.drug_trial_matches.id
  description = var.deployment_description

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "drug_trial_matcher" {
  rest_api_id   = aws_api_gateway_rest_api.drug_trial_matches.id
  deployment_id = aws_api_gateway_deployment.drug_trial_matcher.id
  stage_name    = var.stage_name

  xray_tracing_enabled = false

  tags = var.tags
  
  lifecycle {
    ignore_changes = [deployment_id]
  }
}
