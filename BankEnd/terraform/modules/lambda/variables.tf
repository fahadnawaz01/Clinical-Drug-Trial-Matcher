# ============================================================================
# Lambda Module Variables
# ============================================================================

# UI Agent Lambda
variable "ui_agent_function_name" {
  description = "Name of the UI agent Lambda function"
  type        = string
}

variable "ui_agent_role_arn" {
  description = "IAM role ARN for UI agent Lambda"
  type        = string
}

variable "ui_agent_timeout" {
  description = "Timeout in seconds for UI agent Lambda"
  type        = number
  default     = 20
}

variable "ui_agent_memory_size" {
  description = "Memory size in MB for UI agent Lambda"
  type        = number
  default     = 128
}

variable "ui_agent_environment_variables" {
  description = "Environment variables for UI agent Lambda"
  type        = map(string)
  default     = {}
}

# Clinical Trial API Lambda
variable "clinical_trial_function_name" {
  description = "Name of the clinical trial API Lambda function"
  type        = string
}

variable "clinical_trial_role_arn" {
  description = "IAM role ARN for clinical trial API Lambda"
  type        = string
}

variable "clinical_trial_timeout" {
  description = "Timeout in seconds for clinical trial API Lambda"
  type        = number
  default     = 15
}

variable "clinical_trial_memory_size" {
  description = "Memory size in MB for clinical trial API Lambda"
  type        = number
  default     = 128
}

# Common
variable "tags" {
  description = "Tags to apply to Lambda functions"
  type        = map(string)
  default     = {}
}
