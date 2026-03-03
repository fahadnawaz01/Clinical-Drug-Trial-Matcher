/**
 * Pre-signed URL Generator Lambda Function
 * Generates secure S3 pre-signed URLs for direct browser uploads
 * 
 * Security Features:
 * - 5-minute expiration
 * - File size limit (10 MB)
 * - Allowed file types only
 * - CORS headers for browser access
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Configuration
const BUCKET_NAME = process.env.BUCKET_NAME || 'trial-scout-medical-documents-ap-south-1';
const URL_EXPIRATION = 300; // 5 minutes in seconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Allowed medical document types
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

/**
 * Generate a unique file key with sessionId segregation
 * Format: documents/{sessionId}/{timestamp}-{random}-{filename}
 */
const generateFileKey = (fileName, sessionId) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Use sessionId for user data segregation (Phase 5 requirement)
  return `documents/${sessionId}/${timestamp}-${randomString}-${sanitizedFileName}`;
};

/**
 * Validate file type
 */
const isValidFileType = (fileType) => {
  return ALLOWED_FILE_TYPES.includes(fileType);
};

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Update with your frontend domain in production
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
    
    // Check if event has a body field (API Gateway proxy integration)
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
      // Direct invocation or non-proxy integration - event IS the body
      body = event;
    }

    // Validate required fields
    const { fileName, fileType, fileSize, sessionId, action } = body;

    if (!fileName || !fileType || !sessionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          message: 'fileName, fileType, and sessionId are required'
        })
      };
    }

    // Determine if this is a GET or PUT request
    const isGetRequest = action === 'get';

    // Validate file type
    if (!isValidFileType(fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid file type',
          message: `Allowed types: PDF, JPEG, PNG, DOC, DOCX, TXT`,
          allowedTypes: ALLOWED_FILE_TYPES
        })
      };
    }

    // Validate file size (only for PUT requests)
    if (!isGetRequest && fileSize && fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024} MB`,
          maxSize: MAX_FILE_SIZE
        })
      };
    }

    // Generate unique file key with sessionId (or use existing fileName for GET)
    const fileKey = isGetRequest ? `documents/${sessionId}/${fileName}` : generateFileKey(fileName, sessionId);

    // Create S3 command based on action
    let command;
    if (isGetRequest) {
      // GET request - for viewing/downloading
      command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey
      });
    } else {
      // PUT request - for uploading
      command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        ContentType: fileType,
        Metadata: {
          'original-filename': fileName,
          'upload-timestamp': new Date().toISOString()
        }
      });
    }

    // Generate pre-signed URL
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION
    });

    console.log('Pre-signed URL generated successfully:', {
      fileKey,
      fileName,
      fileType,
      action: isGetRequest ? 'GET' : 'PUT',
      expiresIn: URL_EXPIRATION
    });

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadUrl: presignedUrl,
        viewUrl: presignedUrl, // Alias for GET requests
        fileKey: fileKey,
        expiresIn: URL_EXPIRATION,
        message: `Pre-signed ${isGetRequest ? 'GET' : 'PUT'} URL generated successfully`
      })
    };

  } catch (error) {
    console.error('Error generating pre-signed URL:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate upload URL',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
