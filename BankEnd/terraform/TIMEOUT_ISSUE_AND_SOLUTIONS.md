# Timeout Issue: API Gateway 29-Second Limit

## Current Configuration

### Lambda Timeouts:
- **ui-agent-middlelayer**: 60 seconds
- **clinicaltrialgov-api-lambda**: 15 seconds

### API Gateway Timeout:
- **REST API Hard Limit**: 29 seconds (cannot be increased)

## The Problem

When you see `{"message": "Endpoint request timed out"}`, it means:
1. The Bedrock Agent is taking longer than 29 seconds to respond
2. API Gateway times out before the Lambda completes
3. The Lambda continues running but the client never gets the response

### Why Multi-Agent Takes Longer:
1. Supervisor receives request (~1-2s)
2. Supervisor routes to Clinical Specialist (~2-3s)
3. Clinical Specialist processes and invokes Action Group (~3-5s)
4. Action Group calls ClinicalTrials.gov API (~2-4s)
5. Response flows back through the chain (~2-3s)
6. **Total**: 10-17 seconds (can exceed 29s with network latency)

## Solutions

### Solution 1: Increase Lambda Timeout (Partial Fix)
Increase Lambda timeout to 5 minutes for better resilience:

```hcl
# In ui-agent-middlelayer-lambda.tf
timeout = 300  # 5 minutes
```

**Pros**: Helps with direct Lambda invocations
**Cons**: Doesn't fix API Gateway timeout

### Solution 2: Implement Streaming (Recommended)
Use Bedrock Agent's streaming API with Lambda response streaming:

```javascript
// In ui-agent-middlelayer Lambda
const command = new InvokeAgentCommand({
  agentId: process.env.AGENT_ID,
  agentAliasId: process.env.AGENT_ALIAS_ID,
  sessionId: sessionId,
  inputText: inputText,
  enableTrace: false,
  streamingConfigurations: {
    streamFinalResponse: true
  }
});

// Stream response back to client
const response = await bedrockAgentClient.send(command);
for await (const event of response.completion) {
  // Stream chunks to client
}
```

**Pros**: No timeout issues, better UX
**Cons**: Requires frontend changes to handle streaming

### Solution 3: Async Invocation with Polling (Quick Fix)
1. Lambda returns immediately with a job ID
2. Frontend polls for results
3. Lambda stores results in DynamoDB

**Pros**: Works with current API Gateway
**Cons**: More complex, requires polling logic

### Solution 4: Use WebSocket API (Best Long-term)
Replace REST API with WebSocket API:
- No 29-second timeout
- Real-time bidirectional communication
- Better for chat applications

**Pros**: Solves timeout, enables real-time features
**Cons**: Requires significant refactoring

### Solution 5: Optimize Agent Performance (Immediate)
Reduce agent processing time:

1. **Simplify Agent Instructions**: Shorter prompts = faster processing
2. **Reduce Action Group Calls**: Cache common queries
3. **Optimize Lambda Cold Starts**: Increase memory (faster CPU)
4. **Use Provisioned Concurrency**: Eliminate cold starts

## Recommended Immediate Actions

### 1. Increase Lambda Timeout
```bash
cd trial-scout-frontend/BankEnd/terraform
```

Update `ui-agent-middlelayer-lambda.tf`:
```hcl
timeout = 300  # 5 minutes (helps with direct invocations)
```

### 2. Increase Lambda Memory (Faster CPU)
```hcl
memory_size = 512  # More memory = faster CPU
```

### 3. Add Retry Logic in Frontend
```typescript
// In ChatInterface.tsx
const MAX_RETRIES = 2;
let retries = 0;

while (retries < MAX_RETRIES) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText: text, sessionId, memoryId }),
    });
    
    if (response.ok) break;
    
    if (response.status === 504) {
      retries++;
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        continue;
      }
    }
  } catch (error) {
    retries++;
  }
}
```

### 4. Optimize Agent Instructions (Reduce Processing Time)
Shorten the Clinical Specialist instructions to reduce token processing:

```
You are Trial-Scout's Clinical Specialist. Gather patient parameters and search trials.

1. Ask for condition (mandatory), age, location
2. Default: status=RECRUITING, pageSize=5
3. Invoke ClinicalTrialsSearch action group
4. Return JSON: {"sessionId":"...", "reply":"...", "trials":[...]}
```

## Monitoring

### Check Lambda Duration:
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/ui-agent-middlelayer \
  --filter-pattern "REPORT" \
  --region ap-south-1 \
  --max-items 10
```

### Check API Gateway Latency:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Latency \
  --dimensions Name=ApiName,Value=Drug-Trial-matches \
  --start-time 2026-03-01T00:00:00Z \
  --end-time 2026-03-01T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum \
  --region ap-south-1
```

## Quick Fix to Apply Now

Run these commands:

```bash
cd trial-scout-frontend/BankEnd/terraform

# Update Lambda timeout and memory
cat > lambda_timeout_fix.tf << 'EOF'
# Increase ui-agent-middlelayer timeout and memory
resource "aws_lambda_function" "ui_agent_middlelayer" {
  timeout     = 300  # 5 minutes
  memory_size = 512  # More memory = faster CPU
  
  # ... rest of configuration stays the same
}
EOF

terraform apply
```

**Note**: This won't fix the API Gateway 29-second timeout, but it will:
1. Make the Lambda more resilient
2. Speed up processing with more CPU
3. Help with direct invocations

## Long-term Solution

Implement **Solution 2 (Streaming)** or **Solution 4 (WebSocket API)** for production use.

---

**Current Status**: API Gateway timeout is the bottleneck
**Immediate Fix**: Increase Lambda memory for faster processing
**Long-term Fix**: Implement streaming or WebSocket API
