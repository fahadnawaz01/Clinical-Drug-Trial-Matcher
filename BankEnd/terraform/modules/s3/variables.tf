# ============================================================================
# S3 Module Variables
# ============================================================================

variable "bucket_name" {
  description = "Name of the S3 bucket for medical documents"
  type        = string
}

variable "allowed_origins" {
  description = "List of allowed origins for CORS (frontend URLs)"
  type        = list(string)
  default     = ["http://localhost:5173", "http://localhost:3000"]
}

variable "logging_bucket_name" {
  description = "S3 bucket name for access logs (optional, uses same bucket if empty)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to S3 bucket"
  type        = map(string)
  default     = {}
}
