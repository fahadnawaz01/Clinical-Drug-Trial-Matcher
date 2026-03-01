@echo off
REM ============================================================================
REM Deploy UI Agent Middlelayer Lambda Function
REM ============================================================================

echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo Creating deployment package...
powershell -Command "Compress-Archive -Path src\*, node_modules\*, package.json -DestinationPath function.zip -Force"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to create ZIP file
    exit /b 1
)

echo Deployment package created: function.zip
echo.
echo To deploy via Terraform:
echo   cd ../../terraform
echo   terraform apply
echo.
echo Or to deploy directly via AWS CLI:
echo   aws lambda update-function-code --function-name ui-agent-middlelayer --zip-file fileb://function.zip --region ap-south-1
