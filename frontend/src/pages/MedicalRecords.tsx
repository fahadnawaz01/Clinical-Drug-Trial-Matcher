/**
 * Unified Medical Records Dashboard
 * Premium interface combining upload and document history
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { getSessionId } from '../utils/sessionManager';
import { formatDistanceToNow, format } from 'date-fns';
import '../styles/MedicalRecords.css';

interface MedicalProfile {
  demographics?: {
    name?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string;
  };
  diagnoses?: Array<{
    condition: string;
    icd10Code?: string;
    diagnosisDate?: string;
  }>;
  medications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
  }>;
  allergies?: string[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
}

interface Document {
  timestamp: string;
  fileName: string;
  medicalProfile: MedicalProfile | null;
  processingStatus: string;
  s3Key: string;
  createdAt: string;
}

interface UploadState {
  status: 'idle' | 'requesting' | 'uploading' | 'success' | 'error';
  progress: number;
  message: string;
}

const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const MedicalRecords: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
    'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = getSessionId();
      const response = await fetch(
        `${API_ENDPOINT}/update-profile?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10 MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`;
    }
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return `File type not allowed. Please upload PDF, JPEG, PNG, DOC, DOCX, or TXT files.`;
    }
    return null;
  };

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
      return;
    }

    setSelectedFile(file);
    setUploadState({
      status: 'idle',
      progress: 0,
      message: ''
    });
  };

  const requestPresignedUrl = async (file: File): Promise<string> => {
    setUploadState({
      status: 'requesting',
      progress: 10,
      message: 'Requesting secure upload link...'
    });

    try {
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
          sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      let parsedData = data;
      
      if (data.statusCode && data.body) {
        parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }
      
      if (!parsedData.uploadUrl) {
        throw new Error(parsedData.message || parsedData.error || 'Failed to get upload URL');
      }

      return parsedData.uploadUrl;
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to request upload link'
      );
    }
  };

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

      setUploadState({
        status: 'success',
        progress: 100,
        message: 'Upload successful! Processing document...'
      });

      // Refresh document list after a short delay
      setTimeout(() => {
        fetchDocuments();
        handleReset();
      }, 2000);

    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Failed to upload file'
      );
    }
  };

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
      const presignedUrl = await requestPresignedUrl(selectedFile);
      await uploadToS3(selectedFile, presignedUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        status: 'error',
        progress: 0,
        message: errorMessage
      });
    }
  };

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

  const formatNeatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return `Uploaded ${formatDistanceToNow(date, { addSuffix: true })}`;
      } else if (diffInHours < 48) {
        return `Yesterday, ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM d, yyyy • h:mm a');
      }
    } catch {
      return 'Recently uploaded';
    }
  };

  const extractConditions = (profile: MedicalProfile | null): string[] => {
    if (!profile?.diagnoses) return [];
    return profile.diagnoses.map(d => d.condition).filter(Boolean);
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      const sessionId = getSessionId();
      const response = await fetch(`${API_ENDPOINT}/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'download',
          s3Key: doc.s3Key,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get view URL');
      }

      const data = await response.json();
      let parsedData = data;
      
      if (data.statusCode && data.body) {
        parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }

      const viewUrl = parsedData.viewUrl || parsedData.uploadUrl;
      if (viewUrl) {
        window.open(viewUrl, '_blank');
      } else {
        throw new Error('No view URL returned');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('Failed to open document. Please try again.');
    }
  };

  return (
    <div className="medical-records-page">
      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <h1>{t('upload.title')}</h1>
          <p className="subtitle">{t('upload.subtitle')}</p>
        </div>

        {/* Upload Center */}
        <div className="upload-center">
          <div className="upload-area">
            <input
              ref={fileInputRef}
              type="file"
              id="file-upload"
              className="file-input-hidden"
              accept={Object.values(ALLOWED_FILE_TYPES).join(',')}
              onChange={handleFileSelect}
              disabled={uploadState.status === 'requesting' || uploadState.status === 'uploading'}
            />
            
            {!selectedFile ? (
              <label htmlFor="file-upload" className="upload-prompt">
                <UploadCloud size={48} className="upload-icon" />
                <h3>{t('upload.upload_document')}</h3>
                <p>{t('upload.upload_subtitle')}</p>
                <span className="upload-button-text">{t('upload.choose_file')}</span>
              </label>
            ) : (
              <div className="file-selected">
                <FileText size={32} className="file-icon-large" />
                <div className="file-info">
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
                
                {uploadState.status !== 'idle' && (
                  <div className="upload-progress-inline">
                    <div className="progress-bar-slim">
                      <div 
                        className={`progress-fill-slim ${uploadState.status}`}
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                    <p className={`progress-text ${uploadState.status}`}>
                      {uploadState.message}
                    </p>
                  </div>
                )}

                <div className="upload-actions-inline">
                  {uploadState.status === 'success' ? (
                    <button className="btn-reset" onClick={handleReset}>
                      {t('upload.upload_another')}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-upload"
                        onClick={handleUpload}
                        disabled={uploadState.status === 'requesting' || uploadState.status === 'uploading'}
                      >
                        {uploadState.status === 'requesting' && t('upload.requesting')}
                        {uploadState.status === 'uploading' && t('upload.uploading')}
                        {uploadState.status !== 'requesting' && uploadState.status !== 'uploading' && t('upload.upload_button')}
                      </button>
                      <button className="btn-cancel" onClick={handleReset}>
                        {t('upload.cancel')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Medical History Section */}
        <div className="history-section">
          <h2 className="history-title">{t('navbar.medical_records')}</h2>
          
          {loading ? (
            <div className="loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-icon"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-line skeleton-line-title"></div>
                    <div className="skeleton-line skeleton-line-subtitle"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="error-state">
              <AlertCircle size={48} />
              <p>{error}</p>
              <button onClick={fetchDocuments} className="btn-retry">
                Try Again
              </button>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} className="empty-icon" />
              <h3>{t('upload.no_records')}</h3>
              <p>{t('upload.no_records_subtitle')}</p>
            </div>
          ) : (
            <div className="documents-list">
              {documents.map((doc, index) => {
                const conditions = extractConditions(doc.medicalProfile);
                
                return (
                  <div key={index} className="document-card">
                    <div className="card-left">
                      <div className="doc-icon-container">
                        <FileText size={24} />
                      </div>
                      <div className="doc-details">
                        <h3 className="doc-name">{doc.fileName}</h3>
                        <div className="doc-timestamp">
                          <Calendar size={14} />
                          <span>{formatNeatDate(doc.timestamp)}</span>
                        </div>
                        {conditions.length > 0 && (
                          <div className="condition-chips">
                            {conditions.map((condition, idx) => (
                              <span key={idx} className="condition-chip">
                                {condition}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-right">
                      <button 
                        className="btn-view-doc"
                        onClick={() => handleViewDocument(doc)}
                        title={t('chat.view_document')}
                      >
                        {t('upload.view')}
                      </button>
                      <div className="status-pill">
                        <CheckCircle2 size={14} />
                        <span>{t('upload.analyzed')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecords;
