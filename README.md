# Trial Scout

A modern web application for matching patients with clinical trials in India, featuring AI-powered pre-screening and eligibility assessment.

## Features

- 🔍 **Smart Trial Search**: AI-powered search for clinical trials from ClinicalTrials.gov and CTRI
- 📄 **Document Upload**: Upload medical records for automated profile extraction
- 🎯 **Eligibility Screening**: Interactive pre-screening with provisional fit scores
- 🌐 **Multilingual Support**: Available in English, Hindi, Tamil, Telugu, and more
- 📊 **Detailed Assessments**: Comprehensive eligibility reports with inclusion/exclusion criteria analysis

## Project Structure

```
trial-scout-frontend/
├── frontend/          # React + TypeScript frontend
├── BankEnd/          # AWS Lambda functions and infrastructure
│   ├── lambda-functions/
│   └── terraform/
└── README.md
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

See [frontend/README.md](frontend/README.md) for detailed frontend documentation.

## Backend Infrastructure

The backend uses AWS services:
- **Lambda Functions**: API handlers and document processing
- **API Gateway**: REST API endpoints
- **DynamoDB**: Patient profiles and job results storage
- **S3**: Medical document storage
- **Bedrock**: AI agent orchestration

See [BankEnd/README.md](BankEnd/README.md) for infrastructure details.

## Deployment

### Frontend (AWS Amplify)

See [frontend/QUICK_DEPLOY.md](frontend/QUICK_DEPLOY.md) for deployment instructions.

### Backend (Terraform)

```bash
cd BankEnd/terraform
terraform init
terraform plan
terraform apply
```

## Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_ENDPOINT=https://your-api-gateway-url.com/stage
```

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved
