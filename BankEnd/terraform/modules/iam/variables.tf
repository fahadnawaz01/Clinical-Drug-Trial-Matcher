# ============================================================================
# IAM Module Variables
# ============================================================================

variable "ui_agent_role_name" {
  description = "Name of the UI agent IAM role"
  type        = string
}

variable "ui_agent_managed_policies" {
  description = "List of managed policy ARNs for UI agent role"
  type        = list(string)
  default     = [
    "arn:aws:iam::262530697266:policy/service-role/AWSLambdaBasicExecutionRole-2ac2dc13-06fc-4afc-a177-d6d0fbd12e6f"
  ]
}

variable "clinical_trial_role_name" {
  description = "Name of the clinical trial API IAM role"
  type        = string
}

variable "clinical_trial_managed_policies" {
  description = "List of managed policy ARNs for clinical trial API role"
  type        = list(string)
  default     = [
    "arn:aws:iam::262530697266:policy/service-role/AWSLambdaBasicExecutionRole-7bc66a7d-83f0-4dfb-8025-20aedbe17cfb"
  ]
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for trial fit results"
  type        = string
}

variable "tags" {
  description = "Tags to apply to IAM roles"
  type        = map(string)
  default     = {}
}
