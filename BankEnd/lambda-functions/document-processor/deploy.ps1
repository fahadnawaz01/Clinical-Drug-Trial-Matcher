# PowerShell script to deploy Lambda function
# Only packages source code - AWS SDK is available in Lambda runtime

Write-Host "Creating Lambda deployment package (source only)..." -ForegroundColor Green

# Remove old zip if exists
if (Test-Path "function.zip") {
    Remove-Item "function.zip"
}

# Create zip with src directory structure intact
Compress-Archive -Path src -DestinationPath function.zip -Force

Write-Host "Package created (source only - AWS SDK provided by runtime)" -ForegroundColor Green

# Upload to AWS Lambda
Write-Host "Uploading to AWS Lambda..." -ForegroundColor Green
aws lambda update-function-code `
    --function-name TrialScout_DocProcessor `
    --zip-file fileb://function.zip `
    --region ap-south-1

Write-Host "Deployment complete!" -ForegroundColor Green
