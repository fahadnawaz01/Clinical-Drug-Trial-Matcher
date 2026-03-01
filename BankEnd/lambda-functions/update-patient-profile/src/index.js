/**
 * Update Patient Profile Lambda Function
 * Saves patient medical profile to DynamoDB using sessionId
 * 
 * Flow:
 * 1. Receive POST request with sessionId and profileData
 * 2. Validate required fields
 * 3. Write/update profile in DynamoDB
 * 4. Return success response
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

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
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
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

    // If updating existing profile, preserve createdAt
    // Note: PutCommand will overwrite, so we'd need GetCommand first to preserve createdAt
    // For simplicity, we'll just update both timestamps on every save

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

  } catch (error) {
    console.error('Error saving patient profile:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to save patient profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
