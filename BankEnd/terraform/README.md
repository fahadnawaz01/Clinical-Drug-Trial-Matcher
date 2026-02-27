# Trial-Scout Terraform Infrastructure

Production-ready Terraform configuration for Trial-Scout AWS infrastructure.

## ✅ Migration Status

**Successfully migrated to modular structure** (Feb 28, 2026)
- All 7 AWS resources imported from existing infrastructure
- State migrated from flat structure to modular organization
- Tags applied to all resources (Environment, ManagedBy, Project)
- Configuration validated: **No infrastructure changes required**
- Ready for production use

### Migration Summary
- ✅ 2 Lambda functions organized in `modules/lambda/`
- ✅ 2 IAM roles organized in `modules/iam/`
- ✅ 3 API Gateway resources organized in `modules/api-gateway/`
- ✅ All resources tagged and tracked in Terraform state

## 📁 Structure

```
terraform/
├── main.tf              # Main configuration with module calls
├── provider.tf          # AWS provider configuration
├── variables.tf         # Input variables
├── locals.tf            # Local values and common tags
├── outputs.tf           # Output values
│
└── modules/
    ├── lambda/          # Lambda functions
    ├── iam/             # IAM roles
    └── api-gateway/     # API Gateway REST API
```

## 🚀 Quick Start

```bash
# Initialize Terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# View outputs
terraform output
```

## 📋 Resources Managed

- **Lambda Functions** (2)
  - `ui-agent-middlelayer` - UI to Agent middleware
  - `clinicaltrialgov-api-lambda` - ClinicalTrials.gov API integration

- **IAM Roles** (2)
  - Execution roles for Lambda functions

- **API Gateway** (1)
  - REST API: `Drug-Trial-matches`
  - Stage: `drug-trial-matcher`

## ⚙️ Configuration

### Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region | `ap-south-1` |
| `environment` | Environment name | `production` |
| `project_name` | Project name | `Trial-Scout` |

### Outputs

| Output | Description |
|--------|-------------|
| `api_gateway_endpoint` | API Gateway invoke URL |
| `ui_agent_lambda_arn` | UI Agent Lambda ARN |
| `clinical_trial_lambda_arn` | Clinical Trial Lambda ARN |

## 🔐 Important Notes

1. **Lambda Code**: Function code is managed outside Terraform (via AWS Console/CI-CD)
2. **State File**: Never commit `terraform.tfstate` to version control
3. **Tags**: All resources are tagged with Project, ManagedBy, and Environment

## 📚 Module Documentation

### Lambda Module
Manages Lambda functions with configurable memory, timeout, and environment variables.

### IAM Module
Manages IAM roles with Lambda execution policies.

### API Gateway Module
Manages REST API, deployment, and stage configuration.

## 🔧 Common Commands

```bash
# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Show current state
terraform show

# List resources
terraform state list

# View specific output
terraform output api_gateway_endpoint
```

## 🆘 Troubleshooting

### Issue: Module not found
```bash
terraform init
```

### Issue: State lock
```bash
# If using remote state with locking
terraform force-unlock <lock-id>
```

### Issue: Drift detected
```bash
terraform refresh
terraform plan
```

## 📞 Support

For issues or questions, refer to:
- [Terraform AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [AWS API Gateway Docs](https://docs.aws.amazon.com/apigateway/)
