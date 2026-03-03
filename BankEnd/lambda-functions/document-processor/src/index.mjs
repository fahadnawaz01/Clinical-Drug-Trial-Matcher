// ============================================================================
// Document Processor Lambda - Phase 5 Sub-Phase A
// Asynchronous Medical Document Processing with Bedrock Claude Haiku 4.5
// ============================================================================

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

// Explicitly use ap-south-1 region for all AWS services
const REGION = 'ap-south-1';
const s3Client = new S3Client({ region: REGION });
const dynamoClient = new DynamoDBClient({ region: REGION });
const bedrockClient = new BedrockRuntimeClient({ region: REGION });
const textractClient = new TextractClient({ region: REGION });

export const handler = async (event) => {
  try {
    console.log('📄 Document Processor triggered');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // CRITICAL: Extract sessionId from S3 object key
    // Expected format: documents/{sessionId}/filename.pdf
    const s3Record = event.Records[0].s3;
    const bucketName = s3Record.bucket.name;
    const objectKey = decodeURIComponent(s3Record.object.key.replace(/\+/g, ' '));
    
    console.log('📦 Bucket:', bucketName);
    console.log('🔑 Object Key:', objectKey);
    
    // Parse sessionId from object key
    const keyParts = objectKey.split('/');
    if (keyParts.length < 3 || keyParts[0] !== 'documents') {
      throw new Error(`Invalid object key format. Expected: documents/{sessionId}/filename.pdf, Got: ${objectKey}`);
    }
    
    const sessionId = keyParts[1];
    const fileName = keyParts.slice(2).join('/');
    
    console.log('🆔 SessionId:', sessionId);
    console.log('📝 FileName:', fileName);
    
    // Step 1: Download the PDF from S3
    console.log('⬇️ Downloading document from S3...');
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    });
    
    const s3Response = await s3Client.send(getObjectCommand);
    const documentBytes = await streamToBuffer(s3Response.Body);
    
    console.log(`✅ Downloaded ${documentBytes.length} bytes`);
    
    // Step 1.5: Extract text using AWS Textract (supports PDF and images)
    console.log('📄 Extracting text using AWS Textract...');
    
    const textractCommand = new DetectDocumentTextCommand({
      Document: {
        Bytes: documentBytes
      }
    });
    
    const textractResponse = await textractClient.send(textractCommand);
    
    // Combine all detected text blocks
    const extractedText = textractResponse.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text)
      .join('\n');
    
    console.log(`✅ Extracted ${extractedText.length} characters of text`);
    console.log('First 500 chars:', extractedText.substring(0, 500));
    
    // Step 2: Use Bedrock Claude Haiku 4.5 to extract FHIR-lite medical profile
    console.log('🤖 Invoking Bedrock Claude Haiku 4.5 for document extraction...');
    
    const prompt = `You are a medical document parser. Extract structured patient information from this Indian medical document.

Document text:
${extractedText}

Extract the following information in JSON format:
{
  "demographics": {
    "name": "string or null",
    "age": "number or null",
    "gender": "string or null",
    "dateOfBirth": "string (YYYY-MM-DD) or null"
  },
  "diagnoses": [
    {
      "condition": "string",
      "icd10Code": "string or null",
      "diagnosisDate": "string (YYYY-MM-DD) or null"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dosage": "string or null",
      "frequency": "string or null"
    }
  ],
  "allergies": ["string"],
  "vitalSigns": {
    "bloodPressure": "string or null",
    "heartRate": "number or null",
    "temperature": "number or null",
    "weight": "number or null",
    "height": "number or null"
  }
}

Return ONLY valid JSON, no additional text.`;

    const bedrockPayload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };
    
    const invokeModelCommand = new InvokeModelCommand({
      modelId: "global.anthropic.claude-haiku-4-5-20251001-v1:0", // Same model as Bedrock agents
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(bedrockPayload)
    });
    
    const bedrockResponse = await bedrockClient.send(invokeModelCommand);
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    
    console.log('🤖 Bedrock response:', JSON.stringify(responseBody, null, 2));
    
    // Extract the text content from Claude's response
    const claudeResponseText = responseBody.content[0].text;
    console.log('📝 Claude response text:', claudeResponseText);
    
    // Parse the JSON from Claude's response (handle markdown code blocks)
    let medicalProfile;
    try {
      // Remove markdown code blocks if present - more robust approach
      let jsonText = claudeResponseText.trim();
      
      // Remove opening code fence (```json or ```)
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, '');
      
      // Remove closing code fence (```)
      jsonText = jsonText.replace(/\s*```\s*$/, '');
      
      // Trim again after removing fences
      jsonText = jsonText.trim();
      
      console.log('🔍 Cleaned JSON text (first 200 chars):', jsonText.substring(0, 200));
      
      medicalProfile = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse medical profile JSON:', parseError);
      console.error('Raw response (first 500 chars):', claudeResponseText.substring(0, 500));
      console.error('Cleaned text (first 500 chars):', jsonText.substring(0, 500));
      throw new Error('Bedrock returned invalid JSON');
    }
    
    console.log('✅ Parsed medical profile:', JSON.stringify(medicalProfile, null, 2));
    
    // Step 3: Update DynamoDB with the extracted medical profile
    console.log('💾 Updating DynamoDB...');
    
    const updateCommand = new UpdateItemCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        sessionId: { S: sessionId }
      },
      UpdateExpression: 'SET medicalProfile = :profile, lastUpdated = :timestamp, documentFileName = :fileName',
      ExpressionAttributeValues: {
        ':profile': { S: JSON.stringify(medicalProfile) },
        ':timestamp': { S: new Date().toISOString() },
        ':fileName': { S: fileName }
      },
      ReturnValues: 'ALL_NEW'
    });
    
    const dynamoResponse = await dynamoClient.send(updateCommand);
    console.log('✅ DynamoDB updated:', JSON.stringify(dynamoResponse.Attributes, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Document processed successfully',
        sessionId: sessionId,
        fileName: fileName,
        medicalProfile: medicalProfile
      })
    };
    
  } catch (error) {
    console.error('❌ Error processing document:', error);
    throw error;
  }
};

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
