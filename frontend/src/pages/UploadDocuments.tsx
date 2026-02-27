/**
 * Upload Documents Page
 * Page for uploading medical documents
 */

import React, { useState } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import '../styles/UploadDocuments.css';

interface UploadedDocument {
  fileKey: string;
  fileName: string;
  uploadedAt: Date;
}

const UploadDocuments: React.FC = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);

  const handleUploadComplete = (fileKey: string, fileName: string) => {
    const newDocument: UploadedDocument = {
      fileKey,
      fileName,
      uploadedAt: new Date()
    };

    setUploadedDocuments(prev => [newDocument, ...prev]);
    
    // Store in localStorage
    const stored = localStorage.getItem('uploadedDocuments');
    const existing = stored ? JSON.parse(stored) : [];
    localStorage.setItem('uploadedDocuments', JSON.stringify([newDocument, ...existing]));
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // You can add toast notification here
  };

  return (
    <div className="upload-documents-page">
      <div className="page-header">
        <h1>Medical Documents</h1>
        <p className="page-subtitle">
          Upload your medical records to help us find the best clinical trials for you
        </p>
      </div>

      <div className="page-content">
        {/* Upload Component */}
        <DocumentUpload 
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />

        {/* Uploaded Documents List */}
        {uploadedDocuments.length > 0 && (
          <div className="uploaded-documents">
            <h2>Recently Uploaded</h2>
            <div className="documents-list">
              {uploadedDocuments.map((doc, index) => (
                <div key={index} className="document-item">
                  <svg className="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="doc-info">
                    <p className="doc-name">{doc.fileName}</p>
                    <p className="doc-time">
                      {doc.uploadedAt.toLocaleString()}
                    </p>
                  </div>
                  <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="info-section">
          <h3>Why Upload Documents?</h3>
          <ul className="info-list">
            <li>
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Better trial matching based on your medical history</span>
            </li>
            <li>
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Faster eligibility verification</span>
            </li>
            <li>
              <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Secure, encrypted storage</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadDocuments;
