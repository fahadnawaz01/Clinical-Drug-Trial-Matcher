# Lambda Code Management Guide

## Current Situation

Your Lambda functions are deployed in AWS, but the **code is not in this repository**.

### What's in Terraform
- ✅ Lambda **configuration** (memory, timeout, IAM roles)
- ✅ Lambda **infrastructure** (function names, runtime, environment variables)
- ❌ Lambda **code** (the actual JavaScript/Python that runs)

### Why?
The Terraform configuration uses:
```hcl
filename = "placeholder.zip"

lifecycle {
  ignore_changes = [
    filename,
    source_code_hash,
  ]
}
```

This tells Terraform: "I'm managing the Lambda settings, but NOT the code."

## Where is Your Lambda Code?

Your Lambda code is currently managed **outside this repository**, likely:
1. Deployed directly via AWS Console
2. Deployed via AWS CLI
3. Deployed via a separate CI/CD pipeline
4. Stored in a different repository

## Recommended Structure

You should create a proper structure for Lambda code:

```
trial-scout-frontend/BankEnd/
├── lambda-functions/
│   ├── ui-agent-middlelayer/
│   │   ├── src/
│   │   │   └── index.js           # Main handler
│   │   ├── package.json            # Dependencies
│   │   ├── package-lock.json
│   │   ├── .env.example            # Environment variables template
│   │   ├── README.md               # Function documentation
│   │   └── deploy.sh               # Deployment script
│   │
│   └── clinicaltrialgov-api-lambda/
│       ├── src/
│       │   └── index.js           # Main handler
│       ├── package.json
│       ├── package-lock.json
│       ├── .env.example
│       ├── README.md
│       └── deploy.sh
│
├── terraform/                      # Infrastructure as Code
│   ├── modules/
│   ├── main.tf
│   └── ...
│
└── config-var.txt                  # Resource identifiers
```

## How to Add Lambda Code to This Repo

### Option 1: Manual Deployment (Current)

1. **Download existing code from AWS**:
```bash
# Using AWS CLI
aws lambda get-function --function-name ui-agent-middlelayer \
  --query 'Code.Location' --output text | xargs curl -o ui-agent-middlelayer.zip

# Unzip
unzip ui-agent-middlelayer.zip -d lambda-functions/ui-agent-middlelayer/

# Repeat for second function
aws lambda get-function --function-name clinicaltrialgov-api-lambda \
  --query 'Code.Location' --output text | xargs curl -o clinicaltrialgov-api-lambda.zip
```

2. **Create deployment script**:
```bash
# lambda-functions/ui-agent-middlelayer/deploy.sh
#!/bin/bash
cd "$(dirname "$0")"
npm install
zip -r function.zip . -x "*.git*" "node_modules/aws-sdk/*" "*.md"
aws lambda update-function-code \
  --function-name ui-agent-middlelayer \
  --zip-file fileb://function.zip
```

### Option 2: Terraform Managed (Recommended)

Update Terraform to manage code:

```hcl
# In modules/lambda/main.tf

# Create deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../../lambda-functions/${var.function_name}/src"
  output_path = "${path.root}/../../lambda-functions/${var.function_name}/function.zip"
}

resource "aws_lambda_function" "function" {
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  
  # Remove lifecycle.ignore_changes
  # ... rest of configuration
}
```

### Option 3: CI/CD Pipeline (Production Ready)

Use GitHub Actions or AWS CodePipeline:

```yaml
# .github/workflows/deploy-lambda.yml
name: Deploy Lambda Functions

on:
  push:
    branches: [main]
    paths:
      - 'BankEnd/lambda-functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd BankEnd/lambda-functions/ui-agent-middlelayer
          npm ci
      
      - name: Deploy to AWS Lambda
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd BankEnd/lambda-functions/ui-agent-middlelayer
          zip -r function.zip .
          aws lambda update-function-code \
            --function-name ui-agent-middlelayer \
            --zip-file fileb://function.zip \
            --region ap-south-1
```

## Lambda Function Templates

### ui-agent-middlelayer (Example Structure)

```javascript
// lambda-functions/ui-agent-middlelayer/src/index.js
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const agentId = process.env.AGENT_ID;
    
    try {
        // Your logic here
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Success',
                data: {}
            })
        };
        
        return response;
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
```

```json
// lambda-functions/ui-agent-middlelayer/package.json
{
  "name": "ui-agent-middlelayer",
  "version": "1.0.0",
  "description": "UI to Agent middleware Lambda function",
  "main": "src/index.js",
  "scripts": {
    "test": "jest",
    "deploy": "./deploy.sh"
  },
  "dependencies": {
    "aws-sdk": "^2.1000.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

## Deployment Workflow

### Current (Manual)
1. Edit code in AWS Console
2. Test in AWS Console
3. Save

### Recommended (Version Controlled)
1. Edit code locally in `lambda-functions/`
2. Test locally with SAM or LocalStack
3. Commit to git
4. Push to GitHub
5. CI/CD automatically deploys to AWS
6. Terraform manages infrastructure, CI/CD manages code

## Next Steps

1. **Immediate**: Download your current Lambda code from AWS
2. **Short term**: Add Lambda code to this repository
3. **Medium term**: Set up deployment scripts
4. **Long term**: Implement CI/CD pipeline

## Questions?

- **Q: Should Lambda code be in the same repo as Terraform?**
  - A: Yes for small projects, separate repos for large teams

- **Q: How do I test Lambda locally?**
  - A: Use AWS SAM CLI or LocalStack

- **Q: Should I commit node_modules?**
  - A: No, use package.json and npm install during deployment

- **Q: What about Lambda layers?**
  - A: Create separate directory for layers, deploy via Terraform

## Resources

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Terraform Lambda Function](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)
- [GitHub Actions for AWS](https://github.com/aws-actions)

