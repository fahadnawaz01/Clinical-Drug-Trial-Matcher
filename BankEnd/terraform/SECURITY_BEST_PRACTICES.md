# Security Best Practices for Terraform

## ✅ What's Currently Protected

1. **State files are gitignored** - `terraform.tfstate` contains sensitive data
2. **Variable files are gitignored** - `*.tfvars` files can contain secrets
3. **Lock file is gitignored** - `.terraform.lock.hcl` (though this can be committed)

## ⚠️ What You Should Know

### ARNs (Amazon Resource Names)
**Current Status**: ARNs are exposed in `outputs.tf` and will be visible when committed to git.

**Is this safe?**
- ✅ **Generally YES** - ARNs are identifiers, not credentials
- ✅ They're needed for documentation and integrations
- ✅ AWS requires proper IAM permissions to access resources, ARN alone is not enough
- ⚠️ **BUT** they reveal:
  - Your AWS account ID: `262530697266`
  - Your resource names
  - Your infrastructure structure
  - Your AWS region: `ap-south-1`

**Recommendation**: 
- For **public repos**: Consider using output variables without hardcoded values
- For **private repos**: ARNs in outputs.tf are fine
- **NEVER** commit actual credentials (access keys, secret keys, tokens)

### What's Actually Sensitive

| Item | Sensitive? | Why | Protection |
|------|-----------|-----|------------|
| ARNs | ⚠️ Low | Identifiers only, need IAM permissions to use | Can commit to private repos |
| Account ID | ⚠️ Low | Public info, not a secret | Can commit |
| Resource names | ⚠️ Low | Descriptive only | Can commit |
| IAM role names | ⚠️ Low | Names only, not permissions | Can commit |
| API Gateway URLs | ⚠️ Medium | Public endpoints, but need to be known anyway | Can commit (they're public) |
| terraform.tfstate | 🔴 HIGH | Contains everything + computed values | **MUST gitignore** |
| *.tfvars | 🔴 HIGH | May contain secrets, passwords, keys | **MUST gitignore** |
| AWS credentials | 🔴 CRITICAL | Access keys, secret keys | **NEVER commit** |
| Lambda env vars | 🔴 HIGH | May contain API keys, secrets | Use AWS Secrets Manager |

## 🔒 Best Practices You Should Implement

### 1. Use Variables for Sensitive Data

**Current code** (hardcoded):
```hcl
environment {
  variables = {
    AGENT_ID = "4WTW2OK2XX"  # ⚠️ Hardcoded
  }
}
```

**Better approach**:
```hcl
# In variables.tf
variable "ui_agent_id" {
  description = "Bedrock Agent ID"
  type        = string
  sensitive   = true  # Marks as sensitive in output
}

# In main.tf
environment {
  variables = {
    AGENT_ID = var.ui_agent_id
  }
}

# In terraform.tfvars (gitignored)
ui_agent_id = "4WTW2OK2XX"
```

### 2. Use AWS Secrets Manager for Secrets

For production secrets (API keys, database passwords):
```hcl
data "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "trial-scout/api-key"
}

resource "aws_lambda_function" "example" {
  environment {
    variables = {
      API_KEY = data.aws_secretsmanager_secret_version.api_key.secret_string
    }
  }
}
```

### 3. Use Remote State (S3 Backend)

**Current**: State is local (risky for teams)

**Better**: Store state in S3 with encryption and locking
```hcl
# In provider.tf
terraform {
  backend "s3" {
    bucket         = "trial-scout-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

Benefits:
- ✅ Team collaboration
- ✅ State locking (prevents conflicts)
- ✅ Encrypted at rest
- ✅ Versioned (can rollback)
- ✅ No risk of committing state to git

### 4. Separate Environments

Create separate workspaces or directories:
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars  # gitignored
│   ├── staging/
│   │   ├── main.tf
│   │   └── terraform.tfvars  # gitignored
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars  # gitignored
└── modules/
    ├── lambda/
    ├── iam/
    └── api-gateway/
```

### 5. Use .tfvars for Configuration

**Create `terraform.tfvars`** (gitignored):
```hcl
# terraform.tfvars (NEVER commit this)
aws_region   = "ap-south-1"
environment  = "production"
project_name = "Trial-Scout"

# Sensitive values
ui_agent_id           = "4WTW2OK2XX"
bedrock_agent_alias   = "TSTALIASID"
```

**Create `terraform.tfvars.example`** (commit this):
```hcl
# terraform.tfvars.example (template for team)
aws_region   = "ap-south-1"
environment  = "production"
project_name = "Trial-Scout"

# Sensitive values - replace with your own
ui_agent_id           = "YOUR_AGENT_ID_HERE"
bedrock_agent_alias   = "YOUR_ALIAS_HERE"
```

### 6. Mark Sensitive Outputs

```hcl
output "api_gateway_endpoint" {
  description = "API Gateway invoke URL"
  value       = module.api_gateway.invoke_url
  sensitive   = false  # Public endpoint, OK to show
}

output "lambda_env_vars" {
  description = "Lambda environment variables"
  value       = aws_lambda_function.example.environment
  sensitive   = true  # Hide from console output
}
```

## 🎯 Recommended Actions for Your Project

### Immediate (High Priority)
1. ✅ **Done**: Added `.gitignore` for state files
2. ⚠️ **TODO**: Move `AGENT_ID` to variables
3. ⚠️ **TODO**: Create `terraform.tfvars.example` template
4. ⚠️ **TODO**: Check if `config-var.txt` contains secrets (should be gitignored)

### Short Term (Medium Priority)
1. Set up S3 backend for remote state
2. Use AWS Secrets Manager for sensitive values
3. Separate dev/staging/prod environments
4. Add `sensitive = true` to sensitive outputs

### Long Term (Nice to Have)
1. Implement CI/CD with Terraform Cloud or GitHub Actions
2. Add policy-as-code (Sentinel, OPA)
3. Implement drift detection
4. Add automated security scanning (tfsec, checkov)

## 📋 Quick Security Checklist

Before committing to git:
- [ ] `terraform.tfstate` is gitignored
- [ ] `*.tfvars` files are gitignored
- [ ] No AWS credentials in code
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] Sensitive outputs marked with `sensitive = true`
- [ ] `.tfvars.example` template provided for team
- [ ] README documents what secrets are needed

## 🔍 How to Check for Secrets

```bash
# Check for potential secrets in tracked files
git grep -i "password\|secret\|key\|token" -- '*.tf'

# Check what's being tracked
git ls-files

# Check for accidentally committed state
git log --all --full-history -- "*.tfstate*"
```

## 📚 Resources

- [Terraform Security Best Practices](https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables)
- [AWS Secrets Manager with Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret)
- [Terraform S3 Backend](https://developer.hashicorp.com/terraform/language/settings/backends/s3)
- [tfsec - Security Scanner](https://github.com/aquasecurity/tfsec)

