# ============================================================================
# Input Variables
# ============================================================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "Trial-Scout"
}

variable "project_name_lower" {
  description = "Project name in lowercase for S3 bucket naming"
  type        = string
  default     = "trial-scout"
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for S3 CORS configuration"
  type        = list(string)
  default     = [
    "http://localhost:5173",
    "http://localhost:3000"
  ]
}

variable "bedrock_agent_id" {
  description = "AWS Bedrock Agent ID for the Trial-Scout agent"
  type        = string
  # Set this via terraform.tfvars or environment variable TF_VAR_bedrock_agent_id
}
