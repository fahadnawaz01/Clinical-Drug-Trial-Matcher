# Trial-Scout Project Context Document

> **Purpose**: This document provides complete project context for AI assistants (like Gemini) to understand the Trial-Scout system architecture, current implementation status, and technical details.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [Architecture Overview](#architecture-overview)
4. [Current Implementation Status](#current-implementation-status)
5. [Tech Stack](#tech-stack)
6. [Key Components](#key-components)
7. [Recent Changes & Fixes](#recent-changes--fixes)
8. [Known Issues & Limitations](#known-issues--limitations)
9. [Deployment Process](#deployment-process)
10. [Future Considerations](#future-considerations)

---

## 🎯 Project Overview

**Trial-Scout** is a multilingual AI-powered chatbot that helps Indian patients discover relevant clinical trials by parsing medical records and matching them against global trial databases.

### Mission
Address the "Missing Indian" problem in global medicine, where Indians represent 18% of the world population but less than 2% of clinical trial participants.

### Key Features
- 🌐 **Multilingual Support**: 6 Indian languages (Hindi, Marathi, Bengali, Tamil, Telugu) + English
- 📄 **Document Upload**: OCR processing of medical records (PDF, JPEG, PNG)
- 🤖 **AI Agent**: AWS Bedrock Agent with Claude 3.5 Haiku for conversational trial matching
- 💬 **Chat Interface**: Modern, mobile-responsive chat UI with suggestions
- 🔍 **Trial Search**: Integration with ClinicalTrials.gov API and internal databases
- 💾 **Session Management**: Persistent conversation history with localStorage

---

## 🚨 Problem Statement

### The "Missing Indian" Problem
- **18%** of world population is Indian
- **<2%** of clinical trial participants are Indian
- **Result**: Medical treatments not optimized for Indian genetics, diet, and lifestyle

### Solution Approach
Trial-Scout provides:
1. Culturally appropriate, multilingual access to clinical trial information
2. AI-powered medical record parsing and trial matching
3. Safety validation and medical reasoning
4. Accessible interface for non-technical users

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - Chat Interface                                            │
│  - Document Upload                                           │
│  - Multilingual UI (i18n)                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   AWS API Gateway                            │
│  Endpoint: /drug-trial-matcher                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Lambda: ui-agent-middlelayer                    │
│  - Language instruction injection                            │
│  - JSON parsing & validation                                 │
│  - Session management                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            AWS Bedrock Agent (Supervisor)                    │
│  Model: Claude 3.5 Haiku (Global Inference Profile)         │
│  - Conversational AI                                         │
│  - Trial matching logic                                      │
│  - Medical reasoning                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              External APIs & Databases                       │
│  - ClinicalTrials.gov API                                    │
│  - AWS OpenSearch (vector database)                          │
│  - DynamoDB (patient profiles)                               │
│  - S3 (document storage)                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → Frontend captures message + language preference
2. **API Request** → Sends `{ inputText, sessionId, preferredLanguage }` to Lambda
3. **Language Injection** → Lambda injects language instruction into prompt
4. **Agent Processing** → Bedrock Agent processes request and searches trials
5. **Response Parsing** → Lambda extracts JSON from agent response
6. **UI Update** → Frontend displays reply, trials, and suggestions

---

## ✅ Current Implementation Status

### Phase 1: Core Chatbot (COMPLETE)
- ✅ React TypeScript frontend with Vite
- ✅ AWS Lambda middleware integration
- ✅ Bedrock Agent with Claude 3.5 Haiku
- ✅ Basic trial search functionality
- ✅ Mobile-responsive chat UI

### Phase 2: Document Upload (COMPLETE)
- ✅ File upload with S3 presigned URLs
- ✅ AWS Textract OCR processing
- ✅ Patient profile extraction
- ✅ Document status polling

### Phase 3: Internationalization (COMPLETE)
- ✅ i18next integration
- ✅ 6 language translations (EN, HI, MR, BN, TA, TE)
- ✅ Language switcher in UI
- ✅ Language instruction injection in Lambda

### Phase 4: Suggestions & UX (COMPLETE)
- ✅ AI-generated follow-up suggestions
- ✅ Floating suggestion chips above input
- ✅ Welcome screen with starter prompts
- ✅ Loading state animations
- ✅ Clear chat functionality

### Current Focus: Token Limit Optimization
- ⚠️ Issue: 200K token limit errors in long conversations
- ✅ Fixed: Removed `memoryId` parameter (was causing accumulation)
- ✅ Added: Message counter (20 message warning)
- ✅ Added: Token usage tracking UI
- 🔄 Investigating: sessionId-based context accumulation

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.3.1
- **Routing**: React Router v7.13.1
- **Internationalization**: i18next 25.8.13 + react-i18next 16.5.4
- **Styling**: Pure CSS (no UI libraries)
- **State Management**: React hooks + localStorage
- **Icons**: Lucide React 0.577.0

### Backend (AWS)
- **Compute**: AWS Lambda (Node.js runtime)
- **AI**: AWS Bedrock Agent with Claude 3.5 Haiku
- **API**: AWS API Gateway (REST)
- **Storage**: Amazon S3 (documents), DynamoDB (profiles)
- **OCR**: AWS Textract
- **Search**: AWS OpenSearch (vector database)
- **IaC**: Terraform

### External APIs
- **ClinicalTrials.gov API v2.0**: Primary trial data source
- **WHO ICTRP**: Secondary trial registry

---

## 🔑 Key Components

### Frontend Components

#### 1. ChatInterface.tsx
**Purpose**: Main chat page with conversation management

**Key Features**:
- Session management with persistent sessionId
- Message history in localStorage
- Floating suggestions (max 3)
- Token usage tracking
- Clear chat with sessionId reset
- Welcome screen with starter prompts

**State Management**:
```typescript
const [messages, setMessages] = useLocalStorage<Message[]>('chatMessages', []);
const [sessionId] = useState(() => getSessionId());
const [preferredLanguage, setPreferredLanguage] = useState(i18n.language);
const [latestSuggestions, setLatestSuggestions] = useLocalStorage<string[]>('latestSuggestions', []);
const [cumulativeTokens, setCumulativeTokens] = useState({ input: 0, output: 0, total: 0 });
```

**API Integration**:
```typescript
const response = await fetch(API_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    inputText: text,
    sessionId,
    preferredLanguage
  }),
});
```

#### 2. ChatWindow.tsx
**Purpose**: Scrollable message display area

**Features**:
- Auto-scroll to latest message
- Message bubbles (user vs AI)
- Trial cards display
- Loading indicator

#### 3. ChatInput.tsx
**Purpose**: Message input with file upload

**Features**:
- Text input with Enter key support
- File upload button (paperclip icon)
- Loading state with glowing border animation
- Disabled state during processing

#### 4. MessageBubble.tsx
**Purpose**: Individual message display

**Features**:
- User vs AI styling
- Trial cards rendering
- Suggestions display (currently disabled in favor of floating)
- Timestamp display

#### 5. ChatTrialCard.tsx
**Purpose**: Clinical trial result card

**Features**:
- Trial name, summary, status
- "View Details" button with URL prioritization
- Translatable UI text
- Responsive design

### Backend Components

#### 1. ui-agent-middlelayer Lambda
**Purpose**: Middleware between frontend and Bedrock Agent

**File**: `BankEnd/lambda-functions/ui-agent-middlelayer/src/index.mjs`

**Key Responsibilities**:
1. **Language Instruction Injection**:
```javascript
const languageInstruction = preferredLanguage === 'en'
  ? `\n\n[SYSTEM INSTRUCTION: The user's preferred language is English. You MUST reply in English...]`
  : `\n\n[SYSTEM INSTRUCTION: The user's preferred language is ${preferredLanguage}...]`;

const enhancedMessage = languageInstruction + userMessage;
```

2. **Bedrock Agent Invocation**:
```javascript
const commandParams = {
  agentId: process.env.AGENT_ID,
  agentAliasId: "TSTALIASID",
  sessionId: sessionId,
  inputText: enhancedMessage,
  // NOTE: memoryId removed to prevent token accumulation
};
```

3. **JSON Parsing & Validation**:
- Aggressive JSON extraction from markdown blocks
- Multiple fallback parsing strategies
- Plain text to JSON conversion
- Suggestions array extraction

4. **Response Format**:
```json
{
  "sessionId": "uuid",
  "reply": "AI response text",
  "trials": [
    {
      "trial_name": "string",
      "summary": "string",
      "nct_id": "string",
      "status": "string"
    }
  ],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}
```

#### 2. Bedrock Agent Configuration
**File**: `BankEnd/terraform/bedrock-agent.tf`

**Configuration**:
- **Agent Name**: TrialScout_Supervisor
- **Model**: Claude 3.5 Haiku (Global Inference Profile)
- **Collaboration**: SUPERVISOR mode
- **Memory**: DISABLED (commented out to prevent token accumulation)
- **Session TTL**: 600 seconds (10 minutes)

**Instruction**:
```
Route trial searches to Clinical Specialist. Pass responses unchanged. For greetings, reply briefly.
```

### Utility Functions

#### sessionManager.ts
**Purpose**: Generate and manage persistent IDs

**Functions**:
- `getSessionId()`: Get or create sessionId (conversation thread)
- `clearSessionId()`: Clear sessionId for new conversation
- ~~`getMemoryId()`~~: REMOVED (was causing token accumulation)
- ~~`clearMemoryId()`~~: REMOVED

**Storage Key**: `trialScout_sessionId`

---

## 🔧 Recent Changes & Fixes

### Task 1: Lambda Suggestions Field Support (DONE)
**Issue**: Suggestions not being extracted from agent responses

**Fix**:
- Updated Lambda to extract suggestions array from JSON
- Added explicit language instruction injection
- Fixed JSON parsing for markdown-wrapped responses
- Ensured suggestions field in all response paths

**Files Modified**:
- `BankEnd/lambda-functions/ui-agent-middlelayer/src/index.mjs`

### Task 2: UI Suggestions Implementation (DONE)
**Issue**: No UI for displaying AI suggestions

**Fix**:
- Added suggestions to Message type
- Implemented floating suggestions above input bar
- Suggestions persist in localStorage
- Limited to 3 suggestions max
- Clear on new message or chat clear

**Files Modified**:
- `frontend/src/types/api.ts`
- `frontend/src/pages/ChatInterface.tsx`
- `frontend/src/styles/ChatInterface.css`

### Task 3: Input Bar Positioning (DONE)
**Issue**: Input bar too far from bottom, "Thinking..." indicator distracting

**Fix**:
- Removed disclaimer text
- Adjusted bottom padding to 16px
- Removed "Thinking..." indicator
- Enhanced loading state with glowing border

**Files Modified**:
- `frontend/src/components/ChatInput.tsx`
- `frontend/src/styles/ChatInput.css`

### Task 4: Welcome Page Cards Update (DONE)
**Issue**: Outdated starter prompts

**Fix**:
- Updated 4 suggestion cards with relevant queries
- Changed icons to match content
- Updated text to be more specific

**Files Modified**:
- `frontend/src/pages/ChatInterface.tsx`

### Task 5: Trial Card Link Logic (DONE)
**Issue**: Trial cards not linking correctly

**Fix**:
- Prioritize `details_url` from API
- Fallback to constructing URL from `nct_id` or `trial_id`
- Hide button if no URL available

**Files Modified**:
- `frontend/src/components/ChatTrialCard.tsx`

### Task 6: Floating Suggestions Layout (DONE)
**Issue**: Suggestions stacking vertically with scroll

**Fix**:
- Changed to horizontal layout with nowrap
- Added horizontal scrolling on mobile
- Made chips flex: 0 1 auto for proper spacing

**Files Modified**:
- `frontend/src/styles/ChatInterface.css`

### Task 7: Lambda Language Instruction (DONE)
**Issue**: Agent returning Hindi despite English preference

**Fix**:
- Made language instruction more forceful ("SYSTEM INSTRUCTION")
- Balanced approach for both English and other languages
- Removed excessive logging

**Files Modified**:
- `BankEnd/lambda-functions/ui-agent-middlelayer/src/index.mjs`

### Task 8: Session Management & Token Limit (DONE)
**Issue**: 200K token limit error due to accumulated history

**Fix**:
- Updated handleClearChat to clear sessionId
- Force page reload to generate fresh sessionId
- Prevents token accumulation across chat clears

**Files Modified**:
- `frontend/src/pages/ChatInterface.tsx`

### Task 9: Internationalization (DONE)
**Issue**: UI text not translatable

**Fix**:
- Added translation keys for all UI components
- Updated all 6 language files
- Fixed missing Tamil translations
- Added debug language indicator

**Files Modified**:
- All component files using text
- All 6 translation JSON files
- `frontend/src/i18n.js`

### Task 10: Remove memoryId (DONE)
**Issue**: memoryId causing token accumulation even with memory disabled

**Fix**:
- Completely removed memoryId from Lambda
- Removed memoryId from UI
- Added message counter (20 message warning)
- Added token warning threshold (150K tokens)
- Added cumulative token tracking UI

**Files Modified**:
- `BankEnd/lambda-functions/ui-agent-middlelayer/src/index.mjs`
- `frontend/src/pages/ChatInterface.tsx`
- `frontend/src/types/api.ts`

---

## ⚠️ Known Issues & Limitations

### 1. Token Limit Errors (CRITICAL)
**Issue**: Users hitting 200K token limit in long conversations

**Root Cause**: 
- Bedrock Agent maintains conversation history within a sessionId
- Even with memory disabled, sessionId causes context accumulation
- Long conversations exceed Claude's 200K token limit

**Current Mitigations**:
- ✅ Removed memoryId parameter
- ✅ Clear sessionId on chat clear
- ✅ Message counter warning (20 messages)
- ✅ Token usage tracking UI (150K threshold)

**Potential Solutions**:
1. Implement conversation summarization
2. Rotate sessionId every N messages
3. Use sliding window context
4. Implement conversation pruning

### 2. Token Usage Metrics
**Issue**: Token usage from API is null

**Workaround**: Check CloudWatch Metrics
- Go to AWS CloudWatch → Metrics → AWS/Bedrock/Agents
- Look for `InputTokenCount` and `OutputTokenCount`
- Filter by Agent ID

### 3. Language Switching Reliability
**Issue**: Agent sometimes ignores language preference

**Mitigation**: Language instruction injection in Lambda
- Forceful "SYSTEM INSTRUCTION" prefix
- Repeated in every request
- Overrides agent memory

### 4. Suggestions Not Always Generated
**Issue**: Agent doesn't always return suggestions array

**Mitigation**: Fallback to empty array in Lambda
- Multiple JSON parsing strategies
- Graceful degradation

### 5. Document Processing Timeout
**Issue**: Large documents may timeout during OCR

**Mitigation**: 
- 10 MB file size limit
- 2-minute polling timeout
- User-friendly error messages

---

## 🚀 Deployment Process

### Frontend Deployment (AWS Amplify)
```bash
cd frontend/
npm run build
# Deploy dist/ folder to AWS Amplify
```

### Lambda Deployment
```bash
cd BankEnd/lambda-functions/ui-agent-middlelayer/

# Extract current deployment
unzip lambda-deployment.zip -d temp/

# Update source code
cp src/index.mjs temp/

# Recompress
cd temp/
zip -r ../lambda-deployment-new.zip .
cd ..

# Deploy with AWS CLI
aws lambda update-function-code \
  --function-name ui-agent-middlelayer \
  --zip-file fileb://lambda-deployment-new.zip \
  --region ap-south-1
```

### Terraform Infrastructure
```bash
cd BankEnd/terraform/

# Initialize
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply
```

---

## 🔮 Future Considerations

### Short-Term Improvements
1. **Token Limit Solution**:
   - Implement conversation summarization
   - Rotate sessionId automatically
   - Add conversation pruning logic

2. **Enhanced Suggestions**:
   - Context-aware suggestion generation
   - User preference learning
   - Suggestion history

3. **Performance Optimization**:
   - Reduce Lambda cold starts
   - Optimize JSON parsing
   - Cache trial data

### Medium-Term Features
1. **User Accounts**:
   - Authentication (AWS Cognito)
   - Saved conversations
   - Bookmarked trials

2. **Advanced Search**:
   - Filter by location, phase, status
   - Sort by relevance, distance
   - Save search criteria

3. **Notifications**:
   - New trial alerts
   - Trial status updates
   - Email/SMS integration

### Long-Term Vision
1. **Multi-Agent Architecture**:
   - Scribe Agent (document processing)
   - Doctor Agent (medical validation)
   - Scout Agent (trial discovery)

2. **Advanced AI Features**:
   - Medical reasoning
   - Safety validation
   - Contraindication checking

3. **Expanded Coverage**:
   - More Indian languages
   - Regional trial registries
   - Hospital integrations

---

## 📊 Key Metrics & Monitoring

### CloudWatch Metrics
- **Lambda Invocations**: ui-agent-middlelayer execution count
- **Lambda Duration**: Average response time
- **Lambda Errors**: Error rate and types
- **Bedrock Token Usage**: InputTokenCount, OutputTokenCount
- **API Gateway Requests**: Request count and latency

### User Metrics (Future)
- **Conversation Length**: Average messages per session
- **Trial Matches**: Average trials per query
- **Language Distribution**: Usage by language
- **Document Uploads**: Upload success rate

---

## 🔗 Important Links

### AWS Resources
- **API Gateway**: https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher
- **Lambda Function**: ui-agent-middlelayer (ap-south-1)
- **Bedrock Agent**: TrialScout_Supervisor (4WTW2OK2XX)
- **S3 Bucket**: trial-scout-documents
- **DynamoDB Table**: patient-profiles

### External APIs
- **ClinicalTrials.gov API**: https://clinicaltrials.gov/api/v2/
- **WHO ICTRP**: https://trialsearch.who.int/

### Documentation
- **Requirements**: `trial-scout-frontend/requirements.md`
- **Design**: `trial-scout-frontend/design.md`
- **Backend README**: `trial-scout-frontend/BankEnd/README.md`
- **Frontend README**: `trial-scout-frontend/frontend/README.md`

---

## 📝 Development Notes

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **CSS**: BEM naming convention
- **Comments**: Inline for complex logic only

### Git Workflow
- **Main Branch**: Production-ready code
- **Feature Branches**: For new features
- **Commit Messages**: Descriptive with task reference

### Testing Strategy
- **Unit Tests**: Component-level testing (TODO)
- **Integration Tests**: API integration testing (TODO)
- **E2E Tests**: User flow testing (TODO)
- **Property-Based Tests**: Correctness validation (TODO)

---

## 🤝 Contributing Guidelines

### For AI Assistants (Gemini, Claude, etc.)
1. **Read this document first** to understand project context
2. **Check Recent Changes** section for latest updates
3. **Review Known Issues** before suggesting solutions
4. **Follow Tech Stack** - don't introduce new dependencies without discussion
5. **Maintain Code Style** - match existing patterns
6. **Test Changes** - verify in development environment
7. **Update Documentation** - keep this file current

### For Human Developers
1. Follow the same guidelines as AI assistants
2. Create feature branches for new work
3. Write descriptive commit messages
4. Update this document with significant changes
5. Test thoroughly before deployment

---

## 📞 Support & Contact

### AWS Account
- **Account ID**: 262530697266
- **Region**: ap-south-1 (Mumbai)
- **Environment**: Production

### Project Status
- **Phase**: 1 (Core Chatbot) - COMPLETE
- **Current Focus**: Token limit optimization
- **Next Phase**: Multi-agent architecture

---

**Last Updated**: 2026-03-07
**Document Version**: 1.0
**Maintained By**: Development Team

---

*This document is intended for AI assistants to quickly understand the Trial-Scout project context. Keep it updated with significant changes.*
