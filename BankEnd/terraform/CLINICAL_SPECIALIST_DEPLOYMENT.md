# Clinical Specialist Agent Deployment Guide

## Overview
This guide covers deploying the repurposed Clinical Specialist Agent as the "Medical Pre-Screening Specialist" for standalone testing.

## Changes Made

### 1. Agent Configuration (bedrock-clinical-specialist.tf)
- ✓ Foundation Model: Claude Haiku 4.5
- ✓ Memory: Explicitly disabled (stateless)
- ✓ Instructions: Medical Pre-Screening Specialist persona
- ✓ Agent Alias: Created for standalone testing

### 2. Action Group (bedrock-clinical-specialist-action-group.tf)
- ✓ CTRI Scraper action group attached
- ✓ Lambda permissions configured
- ✓ IAM policies for Lambda invocation
- ✓ OpenAPI schema with ELIGIBILITY module support

## Deployment Steps

### Step 1: Navigate to Terraform directory
```bash
cd trial-scout-frontend/BankEnd/terraform
```

### Step 2: Initialize Terraform (if needed)
```bash
terraform init
```

### Step 3: Plan the deployment
```bash
terraform plan -target=aws_bedrockagent_agent.trial_scout_clinical_specialist \
               -target=aws_bedrockagent_agent_alias.clinical_specialist_alias \
               -target=aws_bedrockagent_agent_action_group.clinical_specialist_ctri_scraper \
               -target=aws_lambda_permission.bedrock_clinical_specialist_invoke_ctri_scraper \
               -target=aws_iam_role_policy.bedrock_clinical_specialist_lambda
```

### Step 4: Apply the changes
```bash
terraform apply -target=aws_bedrockagent_agent.trial_scout_clinical_specialist \
                -target=aws_bedrockagent_agent_alias.clinical_specialist_alias \
                -target=aws_bedrockagent_agent_action_group.clinical_specialist_ctri_scraper \
                -target=aws_lambda_permission.bedrock_clinical_specialist_invoke_ctri_scraper \
                -target=aws_iam_role_policy.bedrock_clinical_specialist_lambda
```

### Step 5: Get Agent ID and Alias ID
```bash
terraform output bedrock_clinical_specialist_agent_id
terraform output bedrock_clinical_specialist_agent_alias_id
```

## Testing in Bedrock Console

1. Navigate to AWS Bedrock Console → Agents
2. Find agent: **TrialScout_ClinicalSpecialist**
3. Use Alias: **MedicalPreScreening**
4. Test with sample input:

```
Trial ID: https://ctri.nic.in/Clinicaltrials/pmaindet2.php?EncHid=ODYzNTU=&Enc=&userName=

Patient Profile:
- Age: 45
- Conditions: Type 2 Diabetes, Hypertension
- Medications: Metformin 1000mg, Lisinopril 10mg
- Recent Labs: HbA1c 7.2%, eGFR 68 ml/min
```

## Expected Behavior

1. Agent receives Trial ID and Patient Profile
2. Agent calls CTRI Scraper with `requestedModules: ["ELIGIBILITY"]`
3. Agent analyzes eligibility criteria vs patient data
4. Agent identifies 3 red flags
5. Agent asks 3-4 clarifying questions
6. Agent outputs final JSON:
```json
{
  "fit_score": 75,
  "match_reasons": ["Age within range", "Diabetes condition matches"],
  "barriers": ["Metformin use may conflict", "eGFR borderline"],
  "status": "Ready"
}
```

## Troubleshooting

### If agent can't invoke Lambda:
- Check CloudWatch logs for permission errors
- Verify IAM policy is attached: `aws_iam_role_policy.bedrock_clinical_specialist_lambda`
- Verify Lambda permission: `aws_lambda_permission.bedrock_clinical_specialist_invoke_ctri_scraper`

### If action group not found:
- Ensure agent is prepared: `prepare_agent = true`
- Check action group is attached to DRAFT version
- Verify action group name matches: "CTRI_trial"

### If scraper returns errors:
- Check CTRI URL format is correct
- Verify `requestedModules` parameter is array: `["ELIGIBILITY"]`
- Check Lambda CloudWatch logs: `/aws/lambda/ctri-scraper-lambda`

## Outputs After Deployment

You should see:
- `bedrock_clinical_specialist_agent_id` = Agent ID (e.g., "ABC123XYZ")
- `bedrock_clinical_specialist_agent_alias_id` = Alias ID (e.g., "TSTALIASID")
- `clinical_specialist_ctri_action_group_id` = Action Group ID
- `clinical_specialist_ctri_action_group_name` = "CTRI_trial"
