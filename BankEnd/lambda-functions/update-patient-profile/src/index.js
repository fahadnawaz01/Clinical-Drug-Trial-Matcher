/**
 * Patient Profile Lambda Function - Step 3: Document History API
 * Supports both GET (fetch history) and POST (legacy profile updates)
 * 
 * GET /profile?userId={userId}
 * - Fetches all document records for a user
 * - Returns array sorted by timestamp descending
 * 
 * POST /update-profile
 * - Legacy endpoint for manual profile updates
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

// Configuration
const TABLE_NAME = process.env.TABLE_NAME || 'TrialScout_PatientProfiles';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  // Handle OPTIONS request (CORS preflight)
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;

    // Route based on HTTP method
    if (httpMethod === 'GET') {
      return await handleGetDocumentHistory(event, headers);
    } else if (httpMethod === 'POST') {
      return await handleUpdateProfile(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ 
          error: 'Method not allowed',
          message: 'Only GET and POST methods are supported'
        })
      };
    }

  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

/**
 * GET handler - Fetch document history for a user
 */
async function handleGetDocumentHistory(event, headers) {
  // Extract userId from query parameters
  const userId = event.queryStringParameters?.userId;

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Missing required parameter',
        message: 'userId query parameter is required'
      })
    };
  }

  console.log('📋 Fetching document history for userId:', userId);

  // Query DynamoDB for all documents belonging to this user
  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false // Sort by timestamp descending (newest first)
  });

  const result = await docClient.send(queryCommand);

  console.log(`✅ Found ${result.Items.length} documents for user ${userId}`);

  // Transform items to include parsed medicalProfile
  const documents = result.Items.map(item => {
    let medicalProfile = null;
    
    // Parse medicalProfile if it's a JSON string
    if (item.medicalProfile) {
      try {
        medicalProfile = typeof item.medicalProfile === 'string' 
          ? JSON.parse(item.medicalProfile) 
          : item.medicalProfile;
      } catch (parseError) {
        console.error('Failed to parse medicalProfile:', parseError);
        medicalProfile = null;
      }
    }

    return {
      timestamp: item.timestamp,
      fileName: item.documentFileName,
      medicalProfile: medicalProfile,
      processingStatus: item.processingStatus,
      s3Key: item.s3Key,
      createdAt: item.createdAt
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      userId: userId,
      documentCount: documents.length,
      documents: documents
    })
  };
}

/**
 * POST handler - Legacy profile update endpoint
 */
async function handleUpdateProfile(event, headers) {
  // Parse request body
  let body;
  
  if (event.body) {
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: 'Request body must be valid JSON'
        })
      };
    }
  } else {
    body = event;
  }

  // Validate required fields
  const { sessionId, profileData } = body;

  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Missing required field',
        message: 'sessionId is required'
      })
    };
  }

  if (!profileData || typeof profileData !== 'object') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid profileData',
        message: 'profileData must be a valid object'
      })
    };
  }

  // Prepare DynamoDB item
  const timestamp = new Date().toISOString();
  const item = {
    sessionId,
    profileData,
    updatedAt: timestamp,
    createdAt: timestamp,
    // Optional: Set TTL for 90 days (in seconds since epoch)
    expiresAt: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
  };

  // Write to DynamoDB
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: item
  });

  await docClient.send(command);

  console.log('Profile saved successfully:', {
    sessionId,
    timestamp,
    profileDataKeys: Object.keys(profileData)
  });

  // Return success response
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Patient profile saved successfully',
      sessionId,
      updatedAt: timestamp
    })
  };
}
