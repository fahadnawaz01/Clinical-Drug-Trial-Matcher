# Quick deployment script - creates minimal zip
$ErrorActionPreference = "Stop"

Write-Host "Creating minimal Lambda package for testing..."

# Create a simple index.js with the code
$indexContent = Get-Content "src/index.mjs" -Raw

# Create temp directory in a short path
$tempDir = "C:\temp-lambda"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy only essential files
Write-Host "Copying source files..."
Copy-Item -Path "src" -Destination "$tempDir/src" -Recurse
Copy-Item -Path "package.json" -Destination "$tempDir/package.json"

# Install production dependencies only in temp location
Write-Host "Installing dependencies in temp location..."
Push-Location $tempDir
npm install --production 2>&1 | Out-Null
Pop-Location

# Create zip
Write-Host "Creating zip..."
$zipPath = Join-Path (Get-Location) "document-processor.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Add-Type -Assembly "System.IO.Compression.FileSystem"
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipPath)

# Clean up
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Created document-processor.zip"
Write-Host "Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB"

# Deploy to AWS
Write-Host "`nDeploying to AWS Lambda..."
aws lambda update-function-code `
    --function-name TrialScout_DocProcessor `
    --zip-file fileb://document-processor.zip `
    --region ap-south-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Lambda function updated successfully!"
} else {
    Write-Host "❌ Failed to update Lambda function"
    exit 1
}
