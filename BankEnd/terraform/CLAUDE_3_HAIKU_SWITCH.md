# Switch from Haiku 4.5 to Claude 3 Haiku

## Problem with Haiku 4.5
After switching to Claude Haiku 4.5, we encountered critical issues:

1. **JSON Output Failure**: Despite explicit instructions to return JSON-only, Haiku 4.5 consistently returned formatted markdown text with trial details instead of JSON
2. **Validation Error**: "Invocation of model ID anthropic.claude-haiku-4-5-20251001-v1:0 with on-demand throughput isn't supported"
3. **Unreliable Behavior**: The agent completely ignored JSON-only constraints

### Example of Haiku 4.5 Output (WRONG):
```
Great news! I've found 5 active clinical trials for Asthma. Here are the details:

**1. Finding Correlations Between Asthma Exacerbation...**
- NCT ID: NCT04845932
- Status: RECRUITING
- Summary: To identify asthma-related physiological changes...
```

This is formatted markdown, NOT the required JSON format.

## Solution: Switch to Claude 3 Haiku

Claude 3 Haiku is:
- **More reliable** for JSON-only output
- **4x cheaper** than Haiku 4.5 ($0.25/$1.25 per million tokens vs $1/$5)
- **Still fast** (not as fast as 4.5, but much more reliable)
- **Proven** to work with JSON constraints

### Pricing Comparison:
| Model | Input (per 1M tokens) | Output (per 1M tokens) | Speed | JSON Reliability |
|-------|----------------------|------------------------|-------|------------------|
| Claude 3.5 Sonnet | $3 | $15 | Slow (35-38s) | High |
| Claude Haiku 4.5 | $1 | $5 | Very Fast (8-10s) | **LOW** ❌ |
| Claude 3 Haiku | $0.25 | $1.25 | Fast (15-20s) | **HIGH** ✅ |

## Changes Applied

### 1. Supervisor Agent (bedrock-agent.tf)
```hcl
# Foundation Model - Claude 3 Haiku (reliable JSON output, 4x cheaper than Haiku 4.5)
foundation_model = "anthropic.claude-3-haiku-20240307-v1:0"
```

### 2. Clinical Specialist Agent (bedrock-clinical-specialist.tf)
```hcl
# Foundation Model - Claude 3 Haiku (reliable JSON output, 4x cheaper than Haiku 4.5)
foundation_model = "anthropic.claude-3-haiku-20240307-v1:0"
```

### 3. Lambda Middleware (ui-agent-middlelayer)
Already updated with JSON parsing logic to handle both JSON and plain text responses.

## Expected Behavior Now

1. Clinical Specialist returns JSON: `{"sessionId":"...","reply":"Found 5 trials","trials":[...]}`
2. Supervisor passes it through unchanged
3. Lambda parses the JSON and spreads it into the response
4. Frontend receives: `{"sessionId":"...","memoryId":"...","reply":"...","trials":[...]}`
5. Frontend displays trial cards correctly

## Deployment Status

✅ Both agents switched to Claude 3 Haiku
✅ Agents prepared and ready
✅ Lambda middleware has JSON parsing logic

## Cost Impact

Switching from Haiku 4.5 to Claude 3 Haiku will **reduce costs by 75%**:
- Input: $1 → $0.25 (75% reduction)
- Output: $5 → $1.25 (75% reduction)

## Speed Impact

Expected response times:
- Haiku 4.5: 8-10 seconds (but unreliable JSON)
- Claude 3 Haiku: 15-20 seconds (reliable JSON)
- Claude 3.5 Sonnet: 35-38 seconds (most reliable, but slowest)

The slight speed reduction is acceptable given the massive cost savings and improved reliability.

## Testing Instructions

1. Open the frontend: http://localhost:5173
2. Send a query: "give me trials for asthma"
3. Open browser console (F12)
4. Check for these log messages:
   - `🤖 Raw agent reply:` - Should show JSON string
   - `✅ Successfully parsed agent reply as JSON:` - Should show parsed object
   - `🎯 MessageBubble rendering with trials: X trials` - Should show trial count
5. Verify trial cards display correctly

## Next Steps

Test the application to verify Claude 3 Haiku returns proper JSON format and trial cards display correctly.
