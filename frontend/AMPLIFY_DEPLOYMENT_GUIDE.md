# AWS Amplify Deployment Guide

## Prerequisites
- AWS Account with Amplify access
- GitHub account
- Repository pushed to GitHub

## Step 1: Push Code to GitHub

If you haven't already, push your code to GitHub:

```bash
# Initialize git (if not already done)
cd trial-scout-frontend
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Trial Scout frontend"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## Step 2: Connect AWS Amplify to GitHub

### Option A: Using AWS Console (Recommended for first-time setup)

1. **Open AWS Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify/
   - Select region: `ap-south-1` (Mumbai)

2. **Create New App**
   - Click "New app" → "Host web app"
   - Select "GitHub" as the repository service
   - Click "Continue"

3. **Authorize GitHub**
   - Click "Authorize AWS Amplify"
   - Sign in to GitHub if prompted
   - Grant AWS Amplify access to your repositories

4. **Select Repository**
   - Choose your repository from the list
   - Select branch: `main` (or your default branch)
   - Click "Next"

5. **Configure Build Settings**
   - App name: `trial-scout-frontend`
   - Environment: `production`
   - The build settings should auto-detect from `amplify.yml`
   - If not, use the configuration below

6. **Add Environment Variables**
   Click "Advanced settings" and add:
   ```
   VITE_API_ENDPOINT=https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher
   ```

7. **Review and Deploy**
   - Review all settings
   - Click "Save and deploy"
   - Wait for deployment to complete (5-10 minutes)

### Option B: Using AWS CLI

```bash
# Install Amplify CLI (if not already installed)
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Initialize Amplify in your project
cd trial-scout-frontend/frontend
amplify init

# Add hosting
amplify add hosting

# Select: Hosting with Amplify Console
# Select: Continuous deployment (Git-based deployments)

# Publish
amplify publish
```

## Step 3: Configure Build Settings (if needed)

If the auto-detection doesn't work, manually configure:

**Build specification (amplify.yml):**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

**Build image:** `Amazon Linux:2023`

**Node version:** `20` (or latest LTS)

## Step 4: Configure Custom Domain (Optional)

1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter your domain name
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning

## Step 5: Set Up Environment Variables

In Amplify Console → App settings → Environment variables:

| Key | Value |
|-----|-------|
| `VITE_API_ENDPOINT` | `https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher` |

## Step 6: Enable Automatic Deployments

Amplify automatically deploys when you push to the connected branch:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main

# Amplify will automatically detect the push and deploy
```

## Monitoring Deployments

1. **View Build Logs**
   - Go to Amplify Console
   - Click on your app
   - View the build progress and logs

2. **Access Your App**
   - After successful deployment, you'll get a URL like:
   - `https://main.d1234567890abc.amplifyapp.com`

## Troubleshooting

### Build Fails

**Check Node Version:**
- Ensure Node 18+ is specified in build settings

**Check Environment Variables:**
- Verify `VITE_API_ENDPOINT` is set correctly

**Check Build Command:**
- Ensure `npm run build` works locally first

### 404 Errors on Refresh

Add a redirect rule in Amplify Console:
- Source: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
- Target: `/index.html`
- Type: `200 (Rewrite)`

### CORS Errors

Ensure your API Gateway has CORS enabled for the Amplify domain.

## Rollback

To rollback to a previous version:
1. Go to Amplify Console
2. Click on the app
3. Find the deployment you want to rollback to
4. Click "Redeploy this version"

## Cost Estimation

AWS Amplify Hosting pricing (as of 2024):
- Build minutes: $0.01 per minute
- Hosting: $0.15 per GB served
- Free tier: 1000 build minutes/month, 15 GB served/month

Estimated monthly cost for low-traffic app: **$0-5**

## Security Best Practices

1. **Never commit `.env` files** - Use Amplify environment variables
2. **Enable branch protection** in GitHub
3. **Use HTTPS only** - Amplify provides free SSL
4. **Restrict API access** - Use API keys or authentication
5. **Monitor access logs** - Enable CloudWatch logging

## Next Steps

After deployment:
1. Test all features on the live URL
2. Set up custom domain (if needed)
3. Configure monitoring and alerts
4. Set up staging environment (optional)
5. Enable preview deployments for pull requests

## Useful Commands

```bash
# View app status
aws amplify list-apps --region ap-south-1

# Trigger manual deployment
aws amplify start-job --app-id YOUR_APP_ID --branch-name main --job-type RELEASE --region ap-south-1

# View deployment logs
aws amplify list-jobs --app-id YOUR_APP_ID --branch-name main --region ap-south-1
```

## Support

- AWS Amplify Documentation: https://docs.aws.amazon.com/amplify/
- GitHub Integration: https://docs.aws.amazon.com/amplify/latest/userguide/getting-started.html
