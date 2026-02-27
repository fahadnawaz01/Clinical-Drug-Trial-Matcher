# ============================================================================
# API Gateway Module Variables
# ============================================================================

variable "api_name" {
  description = "Name of the API Gateway REST API"
  type        = string
}

variable "api_description" {
  description = "Description of the API Gateway"
  type        = string
  default     = "API Gateway for Trial-Scout"
}

variable "stage_name" {
  description = "Name of the API Gateway stage"
  type        = string
}

variable "deployment_id" {
  description = "Deployment ID (for import compatibility)"
  type        = string
  default     = null
}

variable "deployment_description" {
  description = "Description of the API Gateway deployment"
  type        = string
  default     = "API gateway deployment"
}

variable "tags" {
  description = "Tags to apply to API Gateway resources"
  type        = map(string)
  default     = {}
}
