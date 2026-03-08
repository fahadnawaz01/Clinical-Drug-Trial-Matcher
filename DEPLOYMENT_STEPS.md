# 🚀 AWS Amplify Deployment Steps

## ✅ Step 1: Code Pushed to GitHub
Your code is now at: https://github.com/fahadnawaz01/Clinical-Drug-Trial-Matcher

## Step 2: Deploy to AWS Amplify

### Open AWS Amplify Console
1. Go to: https://ap-south-1.console.aws.amazon.com/amplify/home?region=ap-south-1
2. Click **"New app"** → **"Host web app"**

### Connect to GitHub
3. Select **"GitHub"** as the repository service
4. Click **"Continue"**
5. If prompted, click **"Authorize AWS Amplify"** and sign in to GitHub
6. Grant AWS Amplify access to your repositories

### Select Repository
7. **Repository**: Select `fahadnawaz01/Clinical-Drug-Trial-Matcher`
8. **Branch**: Select `main`
9. Click **"Next"**

### Configure Build Settings
10. **App name**: `trial-scout` (or your preferred name)
11. **Environment**: `production`
12. **Build and test settings**: Should auto-detect from `amplify.yml`

**IMPORTANT - Set Monorepo Root:**
13. Click **"Advanced settings"**
14. **Monorepo**: Enable
15. **App root directory**: `frontend`

### Add Environment Variables
16. Still in Advanced settings, add environment variable:
    - **Key**: `VITE_API_ENDPOINT`
    - **Value**: `https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher`

### Review and Deploy
17. Review all settings
18. Click **"Save and deploy"**
19. Wait 5-10 minutes for deployment to complete

### Access Your App
20. Once deployed, you'll get a URL like:
    `https://main.d1234567890abc.amplifyapp.com`
21. Click the URL to access your deployed app!

## Step 3: Configure Redirects (Important for React Router)

After first deployment:

1. In Amplify Console, go to **"App settings"** → **"Rewrites and redirects"**
2. Click **"Edit"**
3. Add this rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
4. Click **"Save"**

This ensures React Router works correctly when users refresh the page.

## Step 4: Test Your Deployment

1. Open the Amplify URL
2. Test key features:
   - ✅ Search for trials
   - ✅ Upload documents
   - ✅ Check My Fit
   - ✅ Language switching
   - ✅ Medical Records page

## Troubleshooting

### Build Fails
- Check build logs in Amplify Console
- Verify `amplify.yml` is correct
- Ensure Node version is 18+

### 404 Errors on Refresh
- Add the redirect rule from Step 3

### API Errors
- Verify `VITE_API_ENDPOINT` environment variable is set correctly
- Check API Gateway CORS settings

### Blank Page
- Check browser console for errors
- Verify all environment variables are set

## Automatic Deployments

From now on, every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Amplify will automatically detect the push and redeploy! 🎉

## Next Steps

1. ✅ Set up custom domain (optional)
2. ✅ Enable branch previews for pull requests
3. ✅ Set up staging environment
4. ✅ Configure monitoring and alerts

## Your Deployment URLs

- **GitHub**: https://github.com/fahadnawaz01/Clinical-Drug-Trial-Matcher
- **Amplify Console**: https://ap-south-1.console.aws.amazon.com/amplify/home?region=ap-south-1
- **Live App**: (Will be provided after deployment)

Good luck! 🚀
