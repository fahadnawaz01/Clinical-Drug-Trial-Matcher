# ============================================================================
# DynamoDB Table for Patient Profiles
# ============================================================================

resource "aws_dynamodb_table" "patient_profiles" {
  name           = "TrialScout_PatientProfiles"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  # Enable point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }

  # Add TTL attribute (optional - can be used to auto-expire old sessions)
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = merge(
    local.common_tags,
    {
      Name        = "TrialScout Patient Profiles"
      Description = "Stores patient medical profiles indexed by sessionId"
    }
  )
}

# Output the table name for use in Lambda environment variables
output "dynamodb_patient_profiles_table_name" {
  description = "Name of the DynamoDB patient profiles table"
  value       = aws_dynamodb_table.patient_profiles.name
}

output "dynamodb_patient_profiles_table_arn" {
  description = "ARN of the DynamoDB patient profiles table"
  value       = aws_dynamodb_table.patient_profiles.arn
}
