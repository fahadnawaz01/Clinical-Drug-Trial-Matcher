# AWS Cost Reduction Steps

## Immediate Actions to Reduce Costs

### 1. Delete Unused Bedrock Agents
You have 3 Bedrock agents running. If you're only using one, delete the others:

```bash
# List all agents
aws bedrock-agent list-agents --region ap-south-1

# Delete unused agents (replace AGENT_ID with actual IDs)
aws bedrock-agent delete-agent --agent-id KUGTRXKVYO --region ap-south-1
aws bedrock-agent delete-agent --agent-id 4WTW2OK2XX --region ap-south-1
aws bedrock-agent delete-agent --agent-id HSWNG5TAJH --region ap-south-1
```

### 2. Clean Up S3 Bucket
Delete old test documents:

```bash
# List objects in bucket
aws s3 ls s3://trial-scout-medical-documents-ap-south-1/ --recursive

# Delete all objects (BE CAREFUL!)
aws s3 rm s3://trial-scout-medical-documents-ap-south-1/ --recursive
```

### 3. Set Up S3 Lifecycle Policy
Automatically delete old documents after 7 days:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket trial-scout-medical-documents-ap-south-1 \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldDocuments",
      "Status": "Enabled",
      "Prefix": "documents/",
      "Expiration": {
        "Days": 7
      }
    }]
  }' \
  --region ap-south-1
```

### 4. Delete Old CloudWatch Logs
Set retention period to 7 days:

```bash
# Set retention for all log groups
aws logs put-retention-policy --log-group-name /aws/lambda/TrialScout_DocProcessor --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /aws/lambda/ui-agent-middlelayer --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /aws/lambda/update-patient-profile --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /aws/lambda/presigned-url-generator --retention-in-days 7 --region ap-south-1
aws logs put-retention-policy --log-group-name /aws/lambda/clinicaltrialgov-api-lambda --retention-in-days 7 --region ap-south-1
```

### 5. Monitor Bedrock Usage
Check your Bedrock costs:

```bash
# Check CloudWatch metrics for Bedrock invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name Invocations \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-02T23:59:59Z \
  --period 86400 \
  --statistics Sum \
  --region ap-south-1
```

### 6. Set Up Billing Alerts
Create a budget alert:

```bash
aws budgets create-budget \
  --account-id 262530697266 \
  --budget '{
    "BudgetName": "TrialScout-Monthly-Budget",
    "BudgetLimit": {
      "Amount": "10",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

## Cost Estimates (Approximate)

### Current Monthly Costs (if actively testing):
- **Bedrock (3 agents + Lambda calls)**: $5-20/month (depends on usage)
- **Lambda**: $0.20-1/month
- **S3**: $0.10-0.50/month
- **DynamoDB**: $0.25-1/month
- **API Gateway**: $0.10-0.50/month
- **CloudWatch Logs**: $0.50-2/month

**Total Estimated**: $6-25/month (mostly Bedrock)

### After Cleanup:
- **Bedrock (1 agent, minimal testing)**: $1-5/month
- **Everything else**: $1-3/month

**Total Estimated**: $2-8/month

## When to Worry

- If you see charges > $50/month, investigate immediately
- Bedrock is the main cost driver - limit testing
- Set up AWS Cost Explorer to track daily costs

## Nuclear Option: Destroy Everything

If you want to stop ALL charges:

```bash
cd trial-scout-frontend/BankEnd/terraform
terraform destroy
```

This will delete all resources and stop all charges.
