# PowerShell script to deploy Lambda function
# This script creates a deployment package and uploads it to AWS Lambda

Write-Host "Creating Lambda deployment package..." -ForegroundColor Green

# Use Python to create zip (handles long paths better)
$pythonScript = @"
import zipfile
import os
from pathlib import Path

def zipdir(path, ziph, base_path):
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, base_path)
            try:
                ziph.write(file_path, arcname)
            except Exception as e:
                print(f'Skipping {file_path}: {e}')

# Create zip file
with zipfile.ZipFile('function.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add src directory
    zipdir('src', zipf, '.')
    
    # Add package.json
    zipf.write('package.json', 'package.json')
    
    # Add node_modules
    zipdir('node_modules', zipf, '.')

print('Zip file created successfully')
"@

# Save Python script temporarily
$pythonScript | Out-File -FilePath "create_zip.py" -Encoding UTF8

# Run Python script
python create_zip.py

# Remove temporary Python script
Remove-Item "create_zip.py"

# Upload to AWS Lambda
Write-Host "Uploading to AWS Lambda..." -ForegroundColor Green
aws lambda update-function-code `
    --function-name TrialScout_DocProcessor `
    --zip-file fileb://function.zip `
    --region ap-south-1

Write-Host "Deployment complete!" -ForegroundColor Green
