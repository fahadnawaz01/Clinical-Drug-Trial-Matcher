// ============================================================================
// Context Poller Lambda - Phase 5 Sub-Phase B
// Polls DynamoDB to check if a specific document has been processed
// ============================================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const REGION = 'ap-south-1';
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  console.log('🔍 Context Poller triggered');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract query parameters
    const sessionId = event.queryStringParameters?.sessionId;
    const expectedFileName = event.queryStringParameters?.expectedFileName;
    
    // Validate required parameters
    if (!sessionId || !expectedFileName) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          error: 'Missing required parameters: sessionId and expectedFileName'
        })
      };
    }
    
    console.log('📋 SessionId:', sessionId);
    console.log('📄 Expected FileName:', expectedFileName);
    
    // Fetch the patient profile from DynamoDB
    const getCommand = new GetCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        sessionId: sessionId
      }
    });
    
    const response = await docClient.send(getCommand);
    
    // Check if item exists
    if (!response.Item) {
      console.log('⚠️ Session not found in DynamoDB');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          status: 'processing'
        })
      };
    }
    
    const item = response.Item;
    console.log('📦 DynamoDB Item:', JSON.stringify(item, null, 2));
    
    // Check for processing errors
    if (item.processingError) {
      console.log('❌ Processing error detected:', item.processingError);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          status: 'error',
          error: item.processingError
        })
      };
    }
    
    // CRITICAL: Check if documentFileName matches expectedFileName
    if (item.documentFileName === expectedFileName && item.medicalProfile) {
      console.log('✅ Document processed! FileName matches.');
      
      // Parse medicalProfile if it's a string
      let profile = item.medicalProfile;
      if (typeof profile === 'string') {
        try {
          profile = JSON.parse(profile);
        } catch (e) {
          console.error('Failed to parse medicalProfile:', e);
        }
      }
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          status: 'complete',
          profile: profile
        })
      };
    } else {
      console.log('⏳ Document still processing or fileName mismatch');
      console.log(`   Current fileName: ${item.documentFileName || 'none'}`);
      console.log(`   Expected fileName: ${expectedFileName}`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          status: 'processing'
        })
      };
    }
    
  } catch (error) {
    console.error('❌ Error polling context:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
