# ============================================================================
# Local Values
# ============================================================================

locals {
  # Common tags applied to all resources
  common_tags = {
    Project     = "Trial-Scout"
    ManagedBy   = "Terraform"
    Environment = "Production"
  }

  # AWS Account and Region
  aws_account_id = "262530697266"
  aws_region     = "ap-south-1"
}
