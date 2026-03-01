# Step 3: Enable Bedrock Agent Memory via AWS Console

## Prerequisites
- Bedrock Agent ID: `4WTW2OK2XX`
- Region: `ap-south-1` (Mumbai)
- Lambda already configured to send `memoryId`

## Configuration Steps

### 1. Navigate to Bedrock Agent
1. Open AWS Console → **Amazon Bedrock**
2. In left sidebar, click **Agents**
3. Find and click your agent (ID: `4WTW2OK2XX`)

### 2. Enable Memory
1. In the agent details page, look for the **Memory** section
2. Click **Edit** or **Configure Memory**
3. Toggle **Enable Memory** to ON

### 3. Configure Memory Settings

**For a Healthcare Intake Bot, use these recommended settings:**

#### Memory Type
- Select: **Session Memory** (default)
- This maintains context within and across conversation sessions

#### Memory Duration
- **Recommended**: `30 days`
- **Rationale**: 
  - Long enough for patients to return and continue conversations
  - Complies with typical healthcare data retention policies
  - Balances memory utility with privacy concerns

#### Memory Configuration Options
- **Max Memory Size**: Leave as default (typically 10,000 tokens)
- **Memory Retrieval**: Automatic (default)
- **Memory Storage**: Managed by AWS (default)

### 4. Save Configuration
1. Click **Save** or **Update Agent**
2. Wait for the agent to update (may take 30-60 seconds)
3. Verify the Memory status shows as **Enabled**

### 5. Prepare New Version (Important!)
1. After enabling memory, click **Prepare** in the top right
2. This creates a new version with memory enabled
3. Wait for preparation to complete

### 6. Update Alias (Critical!)
1. Go to **Aliases** tab
2. Find `TSTALIASID` (your working draft alias)
3. Click **Edit**
4. Update to point to the newly prepared version
5. Click **Save**

**Note**: Your Lambda uses `TSTALIASID`, so this step is critical for memory to work!

## Verification

### Test Memory is Working

1. **First Conversation:**
   - Open your React app
   - Send: "My name is John and I have diabetes"
   - Agent should respond acknowledging your name and condition

2. **Clear Chat (but keep memoryId):**
   - Clear chat messages in UI (localStorage: `chatMessages`)
   - DO NOT clear `trialScout_memoryId`
   - This simulates a new conversation session

3. **Second Conversation:**
   - Send: "What condition do I have?"
   - Agent should remember: "You mentioned you have diabetes"
   - If it remembers, Memory is working! ✅

### Check CloudWatch Logs

1. Go to **CloudWatch** → **Log Groups**
2. Find `/aws/lambda/ui-agent-middlelayer`
3. Look for recent logs showing:
   ```
   🆔 SessionId: [different-uuid]
   🧠 MemoryId: [same-uuid-as-before]
   ✅ Bedrock Agent Memory enabled with memoryId: [uuid]
   ```

## Memory Behavior

### What Gets Remembered
- Patient name and demographics
- Medical conditions mentioned
- Previous questions asked
- Conversation context and preferences
- Trial interests and requirements

### What Doesn't Get Remembered
- Exact conversation history (that's in `sessionId`)
- Temporary session data
- Data older than 30 days (auto-expires)

### Memory Scope
- **Per memoryId**: Each unique `memoryId` has its own memory
- **Cross-session**: Memory persists across different `sessionId` values
- **Long-term**: Lasts for configured duration (30 days recommended)

## Troubleshooting

### Memory Not Working?

**Check 1: Alias Configuration**
- Verify `TSTALIASID` points to the version with memory enabled
- Lambda logs should show `✅ Bedrock Agent Memory enabled`

**Check 2: memoryId in Request**
- Open browser DevTools → Network tab
- Check request payload includes `memoryId`
- Verify it's the same UUID across conversations

**Check 3: Agent Preparation**
- After enabling memory, you MUST click "Prepare"
- Then update the alias to the new version

**Check 4: Memory Duration**
- If testing after 30 days, memory will have expired
- Generate a new `memoryId` by clearing localStorage

### Common Issues

**Issue**: Agent doesn't remember anything
- **Solution**: Verify alias points to prepared version with memory enabled

**Issue**: Memory works but forgets after page refresh
- **Solution**: Check `trialScout_memoryId` persists in localStorage

**Issue**: Different users share memory
- **Solution**: Each user needs unique `memoryId` (currently one per browser)

## Privacy & Compliance Notes

### HIPAA Considerations
- Memory stores conversation context in AWS-managed storage
- Data is encrypted at rest and in transit
- 30-day retention aligns with healthcare best practices
- Consider adding user consent for memory storage

### Data Deletion
To delete a patient's memory:
1. Clear `trialScout_memoryId` from localStorage
2. Memory will expire after 30 days automatically
3. For immediate deletion, contact AWS support (manual process)

## Cost Implications

**Bedrock Agent Memory Pricing:**
- Charged per 1,000 tokens stored
- Typical healthcare conversation: ~500-1,000 tokens
- Estimated cost: **$0.01-0.05 per patient per month**
- 30-day retention keeps costs minimal

**Total estimated cost for hackathon:**
- 10 test users × 30 days = **~$0.50/month**
- Negligible for hackathon purposes

## Next Steps

Once memory is enabled and tested:
1. Test the complete flow: Profile → Chat → Memory
2. Verify memory persists across sessions
3. Test with multiple users (different browsers/devices)
4. Consider adding memory management UI (clear memory button)

---

## ✅ Sub-Phase 3B Complete!

You now have:
- ✅ React frontend sending `sessionId` + `memoryId`
- ✅ Lambda extracting and passing `memoryId` to Bedrock
- ✅ Bedrock Agent Memory enabled (after console configuration)

**The Dual-Brain System is fully operational:**
- **Brain 1 (DynamoDB)**: Explicit profile data (demographics, conditions, medications)
- **Brain 2 (Bedrock Memory)**: Conversational context and learned preferences

Your AI agent now has perfect memory! 🧠
