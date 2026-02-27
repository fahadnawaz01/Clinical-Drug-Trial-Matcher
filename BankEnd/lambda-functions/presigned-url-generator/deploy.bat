@echo off
REM ============================================================================
REM Deploy Pre-signed URL Generator Lambda Function (Windows)
REM ============================================================================

set FUNCTION_NAME=presigned-url-generator
set REGION=ap-south-1
set BUCKET_NAME=trial-scout-medical-documents-ap-south-1

echo Deploying %FUNCTION_NAME% Lambda function...
echo.

REM Navigate to function directory
cd /d "%~dp0"

REM Install dependencies
echo Installing dependencies...
call npm install --production

REM Create deployment package
echo Creating deployment package...
powershell -Command "Compress-Archive -Path src\*,node_modules\* -DestinationPath function.zip -Force"

REM Check if function exists and update
echo Updating Lambda function...
aws lambda update-function-code ^
  --function-name %FUNCTION_NAME% ^
  --zip-file fileb://function.zip ^
  --region %REGION%

REM Update environment variables
aws lambda update-function-configuration ^
  --function-name %FUNCTION_NAME% ^
  --environment "Variables={BUCKET_NAME=%BUCKET_NAME%,AWS_REGION=%REGION%}" ^
  --region %REGION%

REM Clean up
echo Cleaning up...
del function.zip

echo.
echo Deployment complete!
echo.
pause
