# Phase 4: Configuration Fix Applied

## Issue Identified
The Clinical Specialist agent had `agent_collaboration = "SUPERVISOR"` set incorrectly. This was likely set manually in the AWS Console by mistake, which prevented the agent from being prepared.

## Fix Applied
Updated `bedrock-clinical-specialist.tf` to explicitly set:
```hcl
agent_collaboration = "DISABLED"
```

## Why This Matters
- **Supervisor agents** have `agent_collaboration = "SUPERVISOR"` - they coordinate other agents
- **Sub-agents/Collaborators** should have `agent_collaboration = "DISABLED"` - they are invoked by supervisors
- The Clinical Specialist is a sub-agent, so it must have collaboration DISABLED

## Next Steps

### 1. Apply Terraform Changes
```bash
cd trial-scout-frontend/BankEnd/terraform
terraform plan
terraform apply
```

This will update the Clinical Specialist agent configuration and prepare it.

### 2. Verify Agent Status
After applying, verify both agents are in PREPARED status:
```bash
aws bedrock-agent list-agents --region ap-south-1 --query 'agentSummaries[?contains(agentName, `TrialScout`)].{Name:agentName, ID:agentId, Status:agentStatus, Collaboration:agentCollaboration}' --output table
```

Expected output:
```
----------------------------------------------------------------------------------
|                                  ListAgents                                    |
+----------------+----------------+------------------+---------------------------+
| Collaboration  |      ID        |      Name        |         Status            |
+----------------+----------------+------------------+---------------------------+
| SUPERVISOR     | 4WTW2OK2XX     | TrialScout_Supervisor | PREPARED             |
| DISABLED       | KUGTRXKVYO     | TrialScout_ClinicalSpecialist | PREPARED     |
+----------------+----------------+------------------+---------------------------+
```

### 3. Test the Action Group
Once the Clinical Specialist is prepared, test the Action Group invocation:

**Via AWS Console:**
1. Go to Bedrock Agents → TrialScout_ClinicalSpecialist
2. Click "Test" in the Agent Builder
3. Try: "Find clinical trials for diabetes in New York"
4. Verify the agent invokes the Action Group and returns trial data

**Via CLI (if you have test capabilities):**
```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id KUGTRXKVYO \
  --agent-alias-id TSTALIASID \
  --session-id test-session-$(date +%s) \
  --input-text "Find clinical trials for diabetes" \
  --region ap-south-1 \
  output.txt
```

### 4. Verify Multi-Agent Collaboration
Test the full flow through the Supervisor:
```bash
aws bedrock-agent-runtime invoke-agent \
  --agent-id 4WTW2OK2XX \
  --agent-alias-id TSTALIASID \
  --session-id test-session-$(date +%s) \
  --input-text "I need help finding clinical trials for diabetes" \
  --region ap-south-1 \
  output.txt
```

The Supervisor should route to the Clinical Specialist, which should invoke the Action Group.

## Previous Fixes Applied
1. ✅ Changed OpenAPI schema path from `/search` to `/searchClinicalTrials` to match operationId
2. ✅ Set Clinical Specialist collaboration mode to DISABLED

## Architecture Verification

```
User Request
     ↓
TrialScout_Supervisor (agent_collaboration = "SUPERVISOR")
     ↓ (routes trial requests)
TrialScout_ClinicalSpecialist (agent_collaboration = "DISABLED")
     ↓ (invokes)
ClinicalTrialsSearch Action Group
     ↓ (calls)
clinicaltrialgov-api-lambda
```

## Troubleshooting

### If Agent Still Won't Prepare
Check CloudWatch logs for the agent:
```bash
aws logs tail /aws/bedrock/agents/KUGTRXKVYO --follow --region ap-south-1
```

### If Action Group Fails
1. Verify Lambda function exists and is invocable:
   ```bash
   aws lambda get-function --function-name clinicaltrialgov-api-lambda --region ap-south-1
   ```

2. Check Lambda permissions:
   ```bash
   aws lambda get-policy --function-name clinicaltrialgov-api-lambda --region ap-south-1
   ```

3. Test Lambda directly:
   ```bash
   aws lambda invoke \
     --function-name clinicaltrialgov-api-lambda \
     --payload '{"condition":"diabetes","pageSize":5,"status":"RECRUITING"}' \
     --region ap-south-1 \
     response.json
   ```

### If Path Mismatch Error Persists
Verify the Lambda function `clinicaltrialgov-api-lambda` handles the Bedrock Action Group invocation format:
- Bedrock sends: `{"apiPath": "/searchClinicalTrials", "requestBody": {...}}`
- Lambda must extract parameters from `requestBody` and return proper format

---

**Status**: Configuration fix applied, ready for `terraform apply`
**Date**: March 1, 2026
