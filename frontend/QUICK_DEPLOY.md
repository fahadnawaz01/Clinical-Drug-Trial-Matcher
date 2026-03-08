# Quick Deploy to AWS Amplify

## 🚀 Fastest Way to Deploy

### Step 1: Push to GitHub (if not already done)

```bash
# Navigate to your project root
cd trial-scout-frontend

# Initialize git (skip if already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Amplify deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/trial-scout.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy via AWS Console (5 minutes)

1. **Open AWS Amplify**: https://console.aws.amazon.com/amplify/home?region=ap-south-1

2. **Click "New app" → "Host web app"**

3. **Select "GitHub"** and authorize

4. **Select your repository** and branch (`main`)

5. **Configure app:**
   - App name: `trial-scout`
   - Build settings: Auto-detected from `amplify.yml` ✅
   - Root directory: `frontend`

6. **Add environment variable:**
   ```
   VITE_API_ENDPOINT=https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher
   ```

7. **Click "Save and deploy"** ✅

8. **Wait 5-10 minutes** for deployment

9. **Access your app** at the provided URL (e.g., `https://main.xxxxx.amplifyapp.com`)

## ✅ That's it!

Every time you push to GitHub, Amplify will automatically rebuild and deploy.

## 🔧 Important Settings

### Monorepo Configuration

Since your frontend is in a subdirectory, you need to set the build root:

In Amplify Console → App settings → Build settings:
- **Root directory**: `frontend`

Or update `amplify.yml`:
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - cd frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: frontend/dist
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
```

## 🎯 Next Steps

1. ✅ Test the deployed app
2. ✅ Set up custom domain (optional)
3. ✅ Enable preview deployments for PRs
4. ✅ Set up staging environment

## 📞 Need Help?

Check the full guide: `AMPLIFY_DEPLOYMENT_GUIDE.md`
