// ============================================================================
// Context Poller Lambda - Phase 5 Sub-Phase B
// Polls DynamoDB to check if a specific document has been processed
// ALSO handles Trial Fit job polling (async job processing)
// ============================================================================

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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
    const jobId = event.queryStringParameters?.jobId;
    
    // ============================================
    // NEW LOGIC BRANCH: Trial Fit Job Polling
    // ============================================
    if (jobId) {
      console.log('🔄 Polling Trial Fit job:', jobId);
      
      // Query TrialFitResults table
      const getCommand = new GetCommand({
        TableName: 'TrialFitResults',
        Key: { jobId: jobId }
      });
      
      const jobResponse = await docClient.send(getCommand);
      
      if (!jobResponse.Item) {
        console.log('⚠️ Job not found');
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          },
          body: JSON.stringify({
            status: 'not_found',
            error: 'Job not found'
          })
        };
      }
      
      const job = jobResponse.Item;
      console.log('📦 Job status:', job.status);
      
      if (job.status === 'PROCESSING') {
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
      } else if (job.status === 'COMPLETED') {
        console.log('✅ Job completed');
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
            result: job.result
          })
        };
      } else if (job.status === 'FAILED') {
        console.log('❌ Job failed');
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
            error: job.result?.error || 'Job processing failed'
          })
        };
      }
    }
    
    // ============================================
    // EXISTING LOGIC: Profile Document Polling
    // ============================================
    
    // Validate required parameters for profile polling
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
    
    // Query all documents for this user (userId is now the partition key)
    const queryCommand = new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': sessionId
      },
      ScanIndexForward: false, // Sort by timestamp descending (newest first)
      Limit: 10 // Get last 10 documents
    });
    
    const response = await docClient.send(queryCommand);
    
    // Check if any items exist
    if (!response.Items || response.Items.length === 0) {
      console.log('⚠️ No documents found for this user');
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
    
    // Find the document matching the expected filename
    const matchingDoc = response.Items.find(item => 
      item.fileName === expectedFileName || 
      item.documentFileName === expectedFileName
    );
    
    if (!matchingDoc) {
      console.log('⏳ Expected document not found yet');
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
    
    const item = matchingDoc;
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
    
    // CRITICAL: Check if document has medicalProfile (processing complete)
    if (item.medicalProfile) {
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
      console.log('⏳ Document still processing');
      
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
