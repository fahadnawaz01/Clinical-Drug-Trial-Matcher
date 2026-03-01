# ============================================================================
# AWS Bedrock Agent - Trial-Scout Supervisor Agent
# ============================================================================

resource "aws_bedrockagent_agent" "trial_scout_supervisor" {
  agent_name              = "TrialScout_Supervisor"
  agent_resource_role_arn = aws_iam_role.bedrock_agent.arn
  idle_session_ttl_in_seconds = 600
  prepare_agent           = true
  agent_collaboration     = "SUPERVISOR"
  
  # Foundation Model - Claude Haiku 4.5 via Global Inference Profile (fastest, better quality)
  foundation_model = "arn:aws:bedrock:ap-south-1:262530697266:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
  
  # Memory Configuration - DISABLED for testing
  # memory_configuration {
  #   enabled_memory_types = ["SESSION_SUMMARY"]
  #   storage_days         = 30
  # }
  
  # Supervisor Instructions (ultra-fast routing)
  instruction = <<-EOF
    Route trial searches to Clinical Specialist. Pass responses unchanged. For greetings, reply briefly.
  EOF

  tags = {
    Name        = "Trial-Scout Supervisor Agent"
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }
}

# Output the Supervisor agent details
output "bedrock_supervisor_agent_id" {
  description = "ID of the Bedrock Supervisor Agent"
  value       = aws_bedrockagent_agent.trial_scout_supervisor.agent_id
}

output "bedrock_supervisor_agent_arn" {
  description = "ARN of the Bedrock Supervisor Agent"
  value       = aws_bedrockagent_agent.trial_scout_supervisor.agent_arn
}

output "bedrock_supervisor_agent_name" {
  description = "Name of the Bedrock Supervisor Agent"
  value       = aws_bedrockagent_agent.trial_scout_supervisor.agent_name
}
