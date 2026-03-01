@echo off
echo ========================================
echo Deploying Update Patient Profile Lambda
echo ========================================

echo.
echo Step 1: Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed
    exit /b 1
)

echo.
echo Step 2: Creating deployment package...
powershell -Command "Compress-Archive -Path src\* -DestinationPath function.zip -Force"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create zip file
    exit /b 1
)

echo.
echo Step 3: Deploying to AWS Lambda...
aws lambda update-function-code --function-name update-patient-profile --zip-file fileb://function.zip --region ap-south-1

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Lambda deployment failed
    exit /b 1
)

echo.
echo ========================================
echo Deployment successful!
echo ========================================
echo.
echo Lambda function: update-patient-profile
echo Region: ap-south-1
echo.

pause
