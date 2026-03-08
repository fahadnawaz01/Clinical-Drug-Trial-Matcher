# ============================================================================
# DynamoDB Table for Patient Profiles with Document History
# ============================================================================
# Schema: userId (Partition Key) + timestamp (Sort Key)
# This allows storing multiple documents per user with temporal ordering
# ============================================================================

resource "aws_dynamodb_table" "patient_profiles" {
  name           = "TrialScout_PatientProfiles"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "timestamp"

  # Partition Key: userId (identifies the user/session)
  attribute {
    name = "userId"
    type = "S"
  }

  # Sort Key: timestamp (ISO 8601 string for temporal ordering)
  attribute {
    name = "timestamp"
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

  # Add TTL attribute (optional - can be used to auto-expire old documents)
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = merge(
    local.common_tags,
    {
      Name        = "TrialScout Patient Profiles"
      Description = "Stores patient medical document history indexed by userId and timestamp"
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
