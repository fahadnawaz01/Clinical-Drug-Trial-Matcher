# Lambda Function Fix Required: clinicaltrialgov-api-lambda

## Problem
The Lambda function `clinicaltrialgov-api-lambda` is not properly handling Bedrock Action Group invocations. The error indicates:
```
APIPath in Lambda response doesn't match input
```

## Root Cause
Bedrock Action Groups have a specific request/response format that differs from standard API Gateway invocations. The Lambda function needs to:
1. Extract the `apiPath` from the Bedrock request
2. Return the SAME `apiPath` in the response
3. Handle the nested `requestBody` structure

## Bedrock Action Group Request Format
When Bedrock invokes your Lambda, it sends:
```json
{
  "messageVersion": "1.0",
  "agent": {
    "name": "TrialScout_ClinicalSpecialist",
    "id": "KUGTRXKVYO",
    "alias": "prod",
    "version": "1"
  },
  "sessionId": "session-123",
  "sessionAttributes": {},
  "promptSessionAttributes": {},
  "inputText": "Find trials for diabetes",
  "apiPath": "/searchClinicalTrials",
  "httpMethod": "POST",
  "requestBody": {
    "content": {
      "application/json": {
        "properties": [
          {
            "name": "condition",
            "type": "string",
            "value": "diabetes"
          },
          {
            "name": "status",
            "type": "string",
            "value": "RECRUITING"
          },
          {
            "name": "pageSize",
            "type": "integer",
            "value": "5"
          }
        ]
      }
    }
  }
}
```

## Required Lambda Response Format
Your Lambda MUST return:
```json
{
  "messageVersion": "1.0",
  "response": {
    "apiPath": "/searchClinicalTrials",  // MUST match the input apiPath
    "httpMethod": "POST",
    "httpStatusCode": 200,
    "responseBody": {
      "application/json": {
        "body": JSON.stringify({
          "trials": [...],
          "count": 5
        })
      }
    }
  }
}
```

## Fix Implementation

### Step 1: Download Current Lambda Code
```bash
cd trial-scout-frontend/BankEnd/lambda-functions
mkdir -p clinicaltrialgov-api-lambda/src
cd clinicaltrialgov-api-lambda

# Download the code
aws lambda get-function --function-name clinicaltrialgov-api-lambda --region ap-south-1 --query 'Code.Location' --output text | xargs curl -o code.zip

# Extract
unzip code.zip -d src/
rm code.zip
```

### Step 2: Update Lambda Handler
The Lambda needs to be updated to handle Bedrock Action Group format. Here's the required structure:

```javascript
// index.js (or index.mjs)
import https from 'https';

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Extract apiPath from Bedrock request
  const apiPath = event.apiPath;
  const httpMethod = event.httpMethod;
  
  // Extract parameters from Bedrock's nested structure
  const properties = event.requestBody?.content?.['application/json']?.properties || [];
  
  // Convert properties array to object
  const params = {};
  properties.forEach(prop => {
    params[prop.name] = prop.value;
  });
  
  console.log('Extracted parameters:', params);
  
  try {
    // Call ClinicalTrials.gov API
    const trials = await searchClinicalTrials(params);
    
    // Return in Bedrock Action Group format
    return {
      messageVersion: "1.0",
      response: {
        apiPath: apiPath,  // CRITICAL: Must match input
        httpMethod: httpMethod,
        httpStatusCode: 200,
        responseBody: {
          "application/json": {
            body: JSON.stringify({
              trials: trials,
              count: trials.length
            })
          }
        }
      }
    };
  } catch (error) {
    console.error('Error:', error);
    
    return {
      messageVersion: "1.0",
      response: {
        apiPath: apiPath,
        httpMethod: httpMethod,
        httpStatusCode: 500,
        responseBody: {
          "application/json": {
            body: JSON.stringify({
              error: error.message,
              trials: [],
              count: 0
            })
          }
        }
      }
    };
  }
};

async function searchClinicalTrials(params) {
  const { condition, term, location, age, status = 'RECRUITING', pageSize = 5 } = params;
  
  // Build ClinicalTrials.gov API query
  let query = `https://clinicaltrials.gov/api/v2/studies?format=json&pageSize=${pageSize}`;
  
  if (condition) {
    query += `&query.cond=${encodeURIComponent(condition)}`;
  }
  
  if (term) {
    query += `&query.term=${encodeURIComponent(term)}`;
  }
  
  if (location) {
    query += `&query.locn=${encodeURIComponent(location)}`;
  }
  
  if (status) {
    query += `&filter.overallStatus=${status}`;
  }
  
  console.log('ClinicalTrials.gov API query:', query);
  
  // Make HTTPS request
  const data = await new Promise((resolve, reject) => {
    https.get(query, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
  
  // Transform to our format
  const trials = (data.studies || []).map(study => ({
    nct_id: study.protocolSection?.identificationModule?.nctId || 'N/A',
    trial_name: study.protocolSection?.identificationModule?.officialTitle || 
                study.protocolSection?.identificationModule?.briefTitle || 'Untitled',
    status: study.protocolSection?.statusModule?.overallStatus || 'UNKNOWN',
    summary: study.protocolSection?.descriptionModule?.briefSummary || 'No summary available',
    location: study.protocolSection?.contactsLocationsModule?.locations?.[0]?.city || 'Not specified'
  }));
  
  return trials;
}
```

### Step 3: Deploy Updated Lambda
```bash
cd trial-scout-frontend/BankEnd/lambda-functions/clinicaltrialgov-api-lambda/src

# Create deployment package
zip -r ../function.zip .

# Update Lambda
aws lambda update-function-code \
  --function-name clinicaltrialgov-api-lambda \
  --zip-file fileb://../function.zip \
  --region ap-south-1

# Wait for update to complete
aws lambda wait function-updated \
  --function-name clinicaltrialgov-api-lambda \
  --region ap-south-1

echo "Lambda updated successfully"
```

### Step 4: Test Lambda Directly
Test with Bedrock Action Group format:
```bash
cat > test-event.json << 'EOF'
{
  "messageVersion": "1.0",
  "agent": {
    "name": "TrialScout_ClinicalSpecialist",
    "id": "KUGTRXKVYO",
    "alias": "prod",
    "version": "1"
  },
  "sessionId": "test-session-123",
  "apiPath": "/searchClinicalTrials",
  "httpMethod": "POST",
  "requestBody": {
    "content": {
      "application/json": {
        "properties": [
          {
            "name": "condition",
            "type": "string",
            "value": "diabetes"
          },
          {
            "name": "status",
            "type": "string",
            "value": "RECRUITING"
          },
          {
            "name": "pageSize",
            "type": "integer",
            "value": "5"
          }
        ]
      }
    }
  }
}
EOF

aws lambda invoke \
  --function-name clinicaltrialgov-api-lambda \
  --payload file://test-event.json \
  --region ap-south-1 \
  response.json

cat response.json | jq .
```

Expected response:
```json
{
  "messageVersion": "1.0",
  "response": {
    "apiPath": "/searchClinicalTrials",
    "httpMethod": "POST",
    "httpStatusCode": 200,
    "responseBody": {
      "application/json": {
        "body": "{\"trials\":[...],\"count\":5}"
      }
    }
  }
}
```

### Step 5: Test via Bedrock Agent
After Lambda is fixed, test the Clinical Specialist agent:
```
User: "I am 24, from USA. Find clinical trials for diabetes"
```

The agent should:
1. Gather parameters (age: 24, location: USA, condition: diabetes)
2. Invoke the Action Group
3. Lambda returns trials in correct format
4. Agent returns JSON with trials array

## Verification Checklist
- [ ] Lambda extracts `apiPath` from event
- [ ] Lambda extracts parameters from `requestBody.content['application/json'].properties`
- [ ] Lambda returns response with matching `apiPath`
- [ ] Lambda returns `responseBody` in correct nested structure
- [ ] Direct Lambda test succeeds
- [ ] Bedrock Agent test succeeds

## Common Mistakes to Avoid
1. ❌ Returning `apiPath: "/search"` when input was `"/searchClinicalTrials"`
2. ❌ Not wrapping response in `messageVersion` and `response` objects
3. ❌ Returning `responseBody` as plain object instead of nested structure
4. ❌ Not stringifying the body content in `responseBody.application/json.body`

---

**Status**: Lambda fix required before multi-agent system will work
**Priority**: HIGH - Blocking Phase 4 completion
