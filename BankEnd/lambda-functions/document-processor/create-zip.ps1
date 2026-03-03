# Create deployment package for Lambda
$ErrorActionPreference = "Stop"

Write-Host "Creating Lambda deployment package..."

# Remove old zip if exists
if (Test-Path "document-processor.zip") {
    Remove-Item "document-processor.zip" -Force
    Write-Host "Removed old zip file"
}

# Create a temporary directory
$tempDir = "temp-lambda-package"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files to temp directory
Write-Host "Copying files..."
Copy-Item -Path "src" -Destination "$tempDir/src" -Recurse
Copy-Item -Path "node_modules" -Destination "$tempDir/node_modules" -Recurse
Copy-Item -Path "package.json" -Destination "$tempDir/package.json"

# Create zip from temp directory
Write-Host "Creating zip file..."
$source = (Get-Item $tempDir).FullName
$destination = Join-Path (Get-Location) "document-processor.zip"

Add-Type -Assembly "System.IO.Compression.FileSystem"
[System.IO.Compression.ZipFile]::CreateFromDirectory($source, $destination)

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Created document-processor.zip successfully!"
Write-Host "Size: $((Get-Item document-processor.zip).Length / 1MB) MB"
