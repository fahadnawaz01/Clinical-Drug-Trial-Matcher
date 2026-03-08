# Pre-Deployment Checklist ✅

## Security & Sensitive Data

- [x] `.env` files excluded from git (in `.gitignore`)
- [x] `config-var.txt` excluded from git
- [x] Terraform state files excluded (`.terraform/`, `*.tfstate`)
- [x] AWS credentials excluded
- [x] Lambda deployment packages excluded (`*.zip`)
- [x] Presentation files excluded (`*.pdf`, `*.pptx`)
- [x] Internal specs excluded (`.kiro/`)

## Code Cleanup

- [x] Removed unnecessary markdown files
- [x] Removed internal documentation
- [x] Removed temporary/test files
- [x] Cleaned up console.log statements (kept essential ones)

## Files to Keep

✅ **Root Level:**
- `README.md` - Project overview
- `PROJECT_CONTEXT.md` - Development context
- `.gitignore` - Git exclusions

✅ **Frontend:**
- `README.md` - Frontend documentation
- `AMPLIFY_DEPLOYMENT_GUIDE.md` - Deployment instructions
- `QUICK_DEPLOY.md` - Quick start guide
- `amplify.yml` - Build configuration
- `.env.example` - Environment variable template

✅ **Backend:**
- `README.md` - Backend documentation
- `terraform/` - Infrastructure as code

## Sensitive Information Check

### ✅ Safe to Commit:
- API Gateway URLs (public endpoints)
- Lambda function names (public identifiers)
- AWS region (ap-south-1)
- AWS account ID in Terraform (normal for IaC)

### ❌ Never Commit:
- AWS access keys / secret keys
- Database passwords
- API keys for external services
- User credentials
- MFA secrets
- Private keys

## Environment Variables

Ensure `.env.example` exists with template:

```env
# AWS API Gateway endpoint URL
VITE_API_ENDPOINT=https://your-api-gateway-url.com/stage
```

Actual `.env` file should be in `.gitignore` ✅

## Git Status Check

Before pushing, run:

```bash
# Check what will be committed
git status

# Check for sensitive files
git ls-files | grep -E '\.(env|tfstate|zip|pdf|pptx)$'

# Should return nothing if properly excluded
```

## Final Steps Before Push

1. **Review changes:**
   ```bash
   git diff
   ```

2. **Check for secrets:**
   ```bash
   # Install git-secrets (optional but recommended)
   git secrets --scan
   ```

3. **Verify .gitignore:**
   ```bash
   git check-ignore -v .env
   git check-ignore -v BankEnd/config-var.txt
   git check-ignore -v .kiro/
   ```

4. **Test build locally:**
   ```bash
   cd frontend
   npm run build
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

## Post-Push Verification

1. Check GitHub repository - ensure no sensitive files are visible
2. Verify `.env` is not in the repository
3. Verify `config-var.txt` is not in the repository
4. Verify `.kiro/` folder is not in the repository

## Ready for Amplify Deployment

Once verified, proceed with:
- [frontend/QUICK_DEPLOY.md](frontend/QUICK_DEPLOY.md)

## Notes

- AWS account IDs in Terraform files are normal and safe to commit
- Public API Gateway URLs are safe to commit
- Lambda function names are safe to commit
- The actual sensitive data (credentials, keys) are in excluded files
