/**
 * DocumentUpload Component
 * Secure medical document upload using S3 pre-signed URLs
 * 
 * Flow:
 * 1. User selects file
 * 2. Request pre-signed URL from Lambda
 * 3. Upload file directly to S3
 * 4. Confirm upload success
 */

import React, { useState, useRef } from 'react';
import { getSessionId } from '../utils/sessionManager';
import '../styles/DocumentUpload.css';

interface UploadState {
  status: 'idle' | 'requesting' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
  fileKey?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (fileKey: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
}

// Allowed file types
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  onUploadComplete, 
  onUploadError 
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Gateway endpoint
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
    'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher';

  /**
   * Validate file before upload
   */
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10 MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`;
    }

    // Check file type
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return `File type not allowed. Please upload PDF, JPEG, PNG, DOC, DOCX, or TXT files.`;
    }

    return null;
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: error
      });
      if (onUploadError) onUploadError(error);
      return;
    }

    setSelectedFile(file);
    setUploadState({
      status: 'idle',
      progress: 0,
      message: `Selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    });
  };

  /**
   * Step 1: Request pre-signed URL from Lambda
   */
  const requestPresignedUrl = async (file: File): Promise<string> => {
    setUploadState({
      status: 'requesting',
      progress: 10,
      message: 'Requesting secure upload link...'
    });

    try {
      // Get sessionId for user data segregation
      const sessionId = getSessionId();
      
      const response = await fetch(`${API_ENDPOINT}/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          sessionId // CRITICAL: Required for documents/{sessionId}/filename.pdf path
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('Raw API Gateway response:', JSON.stringify(data, null, 2)); // Debug log
      
      // API Gateway wraps Lambda response in statusCode/headers/body
      let parsedData = data;
      
      // If response has statusCode and body, it's wrapped by API Gateway
      if (data.statusCode && data.body) {
        console.log('Detected API Gateway wrapper, parsing body...');
        try {
          parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
          console.log('Parsed body:', JSON.stringify(parsedData, null, 2));
        } catch (parseError) {
          console.error('Failed to parse body:', parseError);
          throw new Error('Invalid response format from server');
        }
      }
      
      // Check if response has the expected structure
      if (!parsedData.uploadUrl) {
        console.error('Missing uploadUrl in response. Full parsed data:', JSON.stringify(parsedData, null, 2));
        throw new Error(parsedData.message || parsedData.error || 'Failed to get upload URL from response');
      }

      console.log('Successfully extracted uploadUrl:', parsedData.uploadUrl);
      return parsedData.uploadUrl;
    } catch (error) {
      console.error('Error requesting pre-signed URL:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to request upload link. Please try again.'
      );
    }
  };

  /**
   * Step 2: Upload file directly to S3 using pre-signed URL
   */
  const uploadToS3 = async (file: File, presignedUrl: string): Promise<void> => {
    setUploadState({
      status: 'uploading',
      progress: 50,
      message: 'Uploading to secure vault...'
    });

    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      // Extract file key from URL
      const url = new URL(presignedUrl);
      const fileKey = url.pathname.substring(1); // Remove leading slash

      setUploadState({
        status: 'success',
        progress: 100,
        message: 'Upload successful!',
        fileKey
      });

      if (onUploadComplete) {
        onUploadComplete(fileKey, file.name);
      }
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to upload file. Please try again.'
      );
    }
  };

  /**
   * Main upload handler
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadState({
        status: 'error',
        progress: 0,
        message: 'Please select a file first'
      });
      return;
    }

    try {
      // Step 1: Get pre-signed URL
      const presignedUrl = await requestPresignedUrl(selectedFile);

      // Step 2: Upload to S3
      await uploadToS3(selectedFile, presignedUrl);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSelectedFile(null);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        status: 'error',
        progress: 0,
        message: errorMessage
      });
      if (onUploadError) onUploadError(errorMessage);
    }
  };

  /**
   * Reset upload state
   */
  const handleReset = () => {
    setUploadState({
      status: 'idle',
      progress: 0,
      message: ''
    });
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="document-upload">
      <div className="upload-header">
        <h3>Upload Medical Document</h3>
        <p className="upload-subtitle">
          Securely upload your medical records (PDF, JPEG, PNG, DOC, DOCX, TXT)
        </p>
      </div>

      <div className="upload-body">
        {/* File Input */}
        <div className="file-input-container">
          <input
            ref={fileInputRef}
            type="file"
            id="file-input"
            className="file-input"
            accept={Object.values(ALLOWED_FILE_TYPES).join(',')}
            onChange={handleFileSelect}
            disabled={uploadState.status === 'requesting' || uploadState.status === 'uploading'}
          />
          <label htmlFor="file-input" className="file-input-label">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Choose File</span>
          </label>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="selected-file-info">
            <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="file-details">
              <p className="file-name">{selectedFile.name}</p>
              <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploadState.status !== 'idle' && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className={`progress-fill ${uploadState.status}`}
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <p className={`progress-message ${uploadState.status}`}>
              {uploadState.message}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="upload-actions">
          {uploadState.status === 'success' ? (
            <button 
              className="btn btn-secondary"
              onClick={handleReset}
            >
              Upload Another
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={
                  !selectedFile || 
                  uploadState.status === 'requesting' || 
                  uploadState.status === 'uploading'
                }
              >
                {uploadState.status === 'requesting' && 'Requesting...'}
                {uploadState.status === 'uploading' && 'Uploading...'}
                {uploadState.status !== 'requesting' && uploadState.status !== 'uploading' && 'Upload Document'}
              </button>
              {selectedFile && uploadState.status === 'idle' && (
                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <svg className="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p>Your documents are encrypted and stored securely</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;
