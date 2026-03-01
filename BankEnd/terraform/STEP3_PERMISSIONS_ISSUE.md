# Step 3: Permissions Issue Resolution

## Problem
When attempting to associate the Clinical Specialist as a collaborator to the Supervisor agent, we encounter:
```
ValidationException: You do not have sufficient permissions to collaborate with this agent alias, or the agent alias does not exist.
```

## Root Cause
The IAM user `fahad01` (ARN: `arn:aws:iam::262530697266:user/fahad01`) lacks the necessary permissions to perform multi-agent collaboration operations.

## Solution: Add IAM Permissions

### Option 1: Add Specific Bedrock Collaboration Permissions (Recommended)
Add the following policy to the IAM user `fahad01`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:AssociateAgentCollaborator",
        "bedrock:DisassociateAgentCollaborator",
        "bedrock:GetAgentCollaborator",
        "bedrock:ListAgentCollaborators",
        "bedrock:UpdateAgentCollaborator"
      ],
      "Resource": [
        "arn:aws:bedrock:ap-south-1:262530697266:agent/*"
      ]
    }
  ]
}
```

### Option 2: Use AWS Console (Workaround)
The AWS Console uses different permissions and may work even if CLI doesn't. Try the manual steps again after ensuring you're logged into the console with sufficient permissions.

### Steps to Add Permissions via Console:

1. **Navigate to IAM Console**
   - Go to: https://console.aws.amazon.com/iam/

2. **Find User**
   - Click "Users" in the left sidebar
   - Search for and click on `fahad01`

3. **Add Inline Policy**
   - Click "Add permissions" → "Create inline policy"
   - Switch to JSON tab
   - Paste the policy from Option 1 above
   - Name it: `BedrockAgentCollaborationPolicy`
   - Click "Create policy"

4. **Retry Association**
   After adding permissions, retry the CLI command:
   ```bash
   aws bedrock-agent associate-agent-collaborator \
     --agent-id 4WTW2OK2XX \
     --agent-version DRAFT \
     --collaborator-name "ClinicalSpecialist" \
     --agent-descriptor "aliasArn=arn:aws:bedrock:ap-south-1:262530697266:agent-alias/KUGTRXKVYO/KYXWVABB99" \
     --collaboration-instruction "The Clinical Specialist is an expert in finding and matching clinical trials. Route all requests related to finding clinical trials, searching for trials by condition or disease, matching patients with trials, questions about trial eligibility, and medical conditions and treatment options. When the Clinical Specialist returns a response, pass it through to the user exactly as received, especially if it contains JSON with trial data." \
     --relay-conversation-history TO_COLLABORATOR \
     --region ap-south-1
   ```

## Resources Created
- ✅ Clinical Specialist Agent Alias: `collaboration` (ID: `KYXWVABB99`)
- ✅ Supervisor Agent Collaboration Mode: `SUPERVISOR`
- ✅ IAM Policies: Supervisor can invoke Clinical Specialist

## Verification Command
After successful association:
```bash
aws bedrock-agent list-agent-collaborators --agent-id 4WTW2OK2XX --agent-version DRAFT --region ap-south-1
```

Expected output should show `ClinicalSpecialist` collaborator with status `ENABLED`.
