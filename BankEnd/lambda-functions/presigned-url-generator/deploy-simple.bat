@echo off
REM Simple deployment script for presigned-url-generator

set FUNCTION_NAME=presigned-url-generator
set REGION=ap-south-1
set BUCKET_NAME=trial-scout-medical-documents-ap-south-1

echo Deploying %FUNCTION_NAME%...
echo.

REM Navigate to function directory
cd /d "%~dp0"

REM Create a simple zip with just the code (no node_modules for now)
echo Creating deployment package...
powershell -Command "Compress-Archive -Path src -DestinationPath function.zip -Force"

REM Update Lambda code
echo Updating Lambda function code...
aws lambda update-function-code ^
  --function-name %FUNCTION_NAME% ^
  --zip-file fileb://function.zip ^
  --region %REGION%

REM Wait for update to complete
timeout /t 5 /nobreak >nul

REM Update environment variables (without AWS_REGION)
echo Updating environment variables...
aws lambda update-function-configuration ^
  --function-name %FUNCTION_NAME% ^
  --environment "Variables={BUCKET_NAME=%BUCKET_NAME%,NODE_ENV=production}" ^
  --region %REGION%

REM Clean up
echo Cleaning up...
del function.zip

echo.
echo Deployment complete!
echo.
echo Note: This deployment uses Lambda Layers for AWS SDK.
echo The AWS SDK v3 is available by default in Node.js 20.x runtime.
echo.
pause
