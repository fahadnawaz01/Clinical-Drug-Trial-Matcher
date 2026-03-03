const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.BUCKET_NAME || 'trial-scout-medical-documents-ap-south-1';
const URL_EXPIRATION = 300;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const generateFileKey = (fileName, sessionId) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return \documents/\/\-\-\\;
};

const isValidFileType = (fileType) => {
  return ALLOWED_FILE_TYPES.includes(fileType);
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
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

    const { fileName, fileType, fileSize, sessionId } = body;

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

    if (!isValidFileType(fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid file type',
          message: \Allowed types: PDF, JPEG, PNG, DOC, DOCX, TXT\,
          allowedTypes: ALLOWED_FILE_TYPES
        })
      };
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File too large',
          message: \Maximum file size is \ MB\,
          maxSize: MAX_FILE_SIZE
        })
      };
    }

    const fileKey = generateFileKey(fileName, sessionId);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        'original-filename': fileName,
        'upload-timestamp': new Date().toISOString()
      }
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION
    });

    console.log('Pre-signed URL generated successfully:', {
      fileKey,
      fileName,
      fileType,
      sessionId,
      expiresIn: URL_EXPIRATION
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uploadUrl: presignedUrl,
        fileKey: fileKey,
        expiresIn: URL_EXPIRATION,
        message: 'Pre-signed URL generated successfully'
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