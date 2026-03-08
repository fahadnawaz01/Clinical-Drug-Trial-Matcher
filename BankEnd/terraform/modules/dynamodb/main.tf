# ============================================================================
# DynamoDB Table for Trial Fit Results (Async Job Processing)
# ============================================================================

resource "aws_dynamodb_table" "trial_fit_results" {
  name           = var.table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "jobId"

  attribute {
    name = "jobId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = merge(
    var.tags,
    {
      Name        = var.table_name
      Purpose     = "Store async trial fit job results"
      Module      = "dynamodb"
    }
  )
}
