# Trial-Scout Backend Infrastructure

This directory contains the backend infrastructure and configuration for Trial-Scout.

## 📁 Directory Structure

```
BankEnd/
├── terraform/                      # Infrastructure as Code
│   ├── modules/                    # Reusable Terraform modules
│   │   ├── lambda/                 # Lambda function module
│   │   ├── iam/                    # IAM roles module
│   │   └── api-gateway/            # API Gateway module
│   ├── main.tf                     # Root module configuration
│   ├── provider.tf                 # AWS provider setup
│   ├── variables.tf                # Input variables
│   ├── outputs.tf                  # Output values (ARNs, endpoints)
│   └── README.md                   # Terraform documentation
│
├── lambda-functions/               # Lambda function code (TODO: Add this)
│   ├── ui-agent-middlelayer/       # UI middleware function
│   └── clinicaltrialgov-api-lambda/# ClinicalTrials.gov API function
│
├── config-var.txt                  # Resource identifiers reference
├── LAMBDA_CODE_GUIDE.md            # Guide for managing Lambda code
└── README.md                       # This file
```

## 🏗️ Infrastructure Overview

### Managed Resources (via Terraform)

| Resource Type | Count | Purpose |
|--------------|-------|---------|
| Lambda Functions | 2 | `ui-agent-middlelayer`, `clinicaltrialgov-api-lambda` |
| IAM Roles | 2 | Lambda execution roles |
| API Gateway | 1 | REST API with deployment and stage |

### AWS Account Details
- **Account ID**: 262530697266
- **Region**: ap-south-1 (Mumbai)
- **Environment**: Production

## 🚀 Quick Start

### Terraform Commands

```bash
cd terraform/

# Initialize Terraform
terraform init

# View current infrastructure
terraform state list

# Check for changes
terraform plan

# Apply changes
terraform apply

# View outputs (ARNs, endpoints)
terraform output
```

### API Gateway Endpoint

```
https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher
```

## 📝 Important Files

### config-var.txt
Contains reference information about deployed resources:
- Lambda function names and ARNs
- IAM role names and ARNs
- API Gateway details
- Endpoint URLs

**Note**: This file contains identifiers (ARNs), not secrets. Safe to commit to private repos.

### terraform/
Infrastructure as Code using Terraform with modular structure:
- **Modules**: Reusable components for Lambda, IAM, and API Gateway
- **State**: Tracked locally (consider S3 backend for teams)
- **Tags**: All resources tagged with Environment, ManagedBy, Project

## 🔒 Security Notes

### What's Safe to Commit
✅ Terraform configuration files (*.tf)
✅ ARNs and resource identifiers
✅ API Gateway URLs (they're public endpoints)
✅ Account ID (not a secret)

### What's Gitignored
❌ `terraform.tfstate` - Contains sensitive computed values
❌ `*.tfvars` - May contain secrets
❌ AWS credentials
❌ Lambda deployment packages (*.zip)

### What's Missing (Lambda Code)
⚠️ Lambda function code is NOT in this repository
- Currently managed outside Terraform
- See `LAMBDA_CODE_GUIDE.md` for how to add it

## 📚 Documentation

- **[terraform/README.md](terraform/README.md)** - Terraform usage and configuration
- **[terraform/SECURITY_BEST_PRACTICES.md](terraform/SECURITY_BEST_PRACTICES.md)** - Security guidelines
- **[terraform/MIGRATION_COMPLETE.md](terraform/MIGRATION_COMPLETE.md)** - Migration history
- **[LAMBDA_CODE_GUIDE.md](LAMBDA_CODE_GUIDE.md)** - Lambda code management

## 🎯 Next Steps

### Immediate
1. ✅ Terraform infrastructure is set up and validated
2. ⚠️ Add Lambda function code to repository
3. ⚠️ Create deployment scripts for Lambda functions

### Short Term
1. Set up S3 backend for Terraform state (team collaboration)
2. Move sensitive values to `terraform.tfvars` (gitignored)
3. Implement CI/CD for Lambda deployments

### Long Term
1. Add CloudWatch Log Groups to Terraform
2. Add API Gateway integrations and methods
3. Implement automated testing
4. Add monitoring and alerting

## 🔗 Resources

### Lambda Functions
- **ui-agent-middlelayer**
  - ARN: `arn:aws:lambda:ap-south-1:262530697266:function:ui-agent-middlelayer`
  - Role: `ui-agent-middlelayer-role-vyybgke5`
  - Environment: `AGENT_ID=4WTW2OK2XX`

- **clinicaltrialgov-api-lambda**
  - ARN: `arn:aws:lambda:ap-south-1:262530697266:function:clinicaltrialgov-api-lambda`
  - Role: `clinicaltrialgov-api-lambda-role-5vkf0niy`

### API Gateway
- **REST API**: Drug-Trial-matches (rk1zsye504)
- **Stage**: drug-trial-matcher
- **Endpoint**: https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher

## 📞 Support

For questions about:
- **Terraform**: See `terraform/README.md`
- **Lambda Code**: See `LAMBDA_CODE_GUIDE.md`
- **Security**: See `terraform/SECURITY_BEST_PRACTICES.md`

