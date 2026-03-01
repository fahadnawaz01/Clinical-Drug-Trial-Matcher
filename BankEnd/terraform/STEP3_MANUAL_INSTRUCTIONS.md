# Step 3: Manual Configuration Required

## Multi-Agent Collaboration Setup

Due to current Terraform AWS provider limitations, the agent collaborator association must be configured manually via the AWS Console.

### Prerequisites Completed via Terraform:
✅ Supervisor agent collaboration mode enabled (`agent_collaboration = "SUPERVISOR"`)
✅ Clinical Specialist agent alias created (ID: `PTLXUQO3TA`, ARN: `arn:aws:bedrock:ap-south-1:262530697266:agent-alias/KUGTRXKVYO/PTLXUQO3TA`)
✅ Supervisor IAM role has permissions to invoke Clinical Specialist

### Manual Steps Required:

1. **Navigate to AWS Bedrock Console**
   - Go to: https://ap-south-1.console.aws.amazon.com/bedrock/home?region=ap-south-1#/agents

2. **Open Supervisor Agent**
   - Click on `TrialScout_Supervisor` (ID: `4WTW2OK2XX`)
   - Click "Edit in Agent Builder"

3. **Add Collaborator**
   - Scroll to "Agent collaborators" section
   - Click "Add collaborator"
   - **Collaborator name**: `ClinicalSpecialist`
   - **Agent alias**: Select `TrialScout_ClinicalSpecialist` → `prod` alias
   - **Collaboration instruction**:
     ```
     The Clinical Specialist is an expert in finding and matching clinical trials. Route all requests related to finding clinical trials, searching for trials by condition or disease, matching patients with trials, questions about trial eligibility, and medical conditions and treatment options. When the Clinical Specialist returns a response, pass it through to the user exactly as received, especially if it contains JSON with trial data.
     ```
   - **Relay conversation history**: Select "TO_COLLABORATOR"
   - Click "Add"

4. **Save and Prepare**
   - Click "Save and exit"
   - The agent will automatically prepare

### Verification:
Run this command to verify the collaborator was added:
```bash
aws bedrock-agent list-agent-collaborators --agent-id 4WTW2OK2XX --agent-version DRAFT --region ap-south-1
```

Expected output should show `ClinicalSpecialist` collaborator.

### Alternative CLI Command (if permissions are resolved):
```bash
aws bedrock-agent associate-agent-collaborator \
  --agent-id 4WTW2OK2XX \
  --agent-version DRAFT \
  --collaborator-name "ClinicalSpecialist" \
  --agent-descriptor "aliasArn=arn:aws:bedrock:ap-south-1:262530697266:agent-alias/KUGTRXKVYO/PTLXUQO3TA" \
  --collaboration-instruction "The Clinical Specialist is an expert in finding and matching clinical trials. Route all requests related to finding clinical trials, searching for trials by condition or disease, matching patients with trials, questions about trial eligibility, and medical conditions and treatment options. When the Clinical Specialist returns a response, pass it through to the user exactly as received, especially if it contains JSON with trial data." \
  --relay-conversation-history TO_COLLABORATOR \
  --region ap-south-1
```
