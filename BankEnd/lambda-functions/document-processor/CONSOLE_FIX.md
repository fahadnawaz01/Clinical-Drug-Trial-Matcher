# Console Fix for Lambda Deployment Issue

## Problem
Missing module `@aws/lambda-invoke-store` due to incomplete node_modules packaging on Windows.

## Solution: Remove the Lambda Layer

1. Go to: https://ap-south-1.console.aws.amazon.com/lambda/home?region=ap-south-1#/functions/TrialScout_DocProcessor

2. Scroll down to **Layers** section

3. Click **Edit** button

4. Click the **X** to remove the `LambdaAdapterLayerX86:22` layer

5. Click **Save**

6. Test by uploading a document

## Why This Works
The Lambda Adapter Layer is conflicting with the AWS SDK. Removing it allows the function to use the packaged dependencies correctly.

## If That Doesn't Work
The node_modules in the deployment package is incomplete. You'll need to:

1. Use Terraform to redeploy from a Linux machine, OR
2. Use AWS CloudShell (built-in Linux terminal in AWS Console) to package and deploy

### CloudShell Method:
1. Open CloudShell in AWS Console (icon at top right)
2. Run these commands:

```bash
# Clone or upload your code
mkdir lambda-deploy
cd lambda-deploy

# Create the Lambda code
cat > index.mjs << 'EOF'
[paste the entire contents of src/index.mjs here]
EOF

# Create package.json
cat > package.json << 'EOF'
{
  "name": "document-processor",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/client-bedrock-runtime": "^3.600.0",
    "@aws-sdk/client-textract": "^3.600.0"
  }
}
EOF

# Install dependencies
npm install

# Create deployment package
mkdir -p src
mv index.mjs src/
zip -r function.zip src/ node_modules/ package.json

# Deploy
aws lambda update-function-code \
    --function-name TrialScout_DocProcessor \
    --zip-file fileb://function.zip \
    --region ap-south-1
```

This will create a proper deployment package on Linux without path length issues.
