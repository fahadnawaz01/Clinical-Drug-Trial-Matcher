/**
 * Upload Document Button Component
 * Smart button that appears when documents are mentioned in chat
 */

import { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import Toast from './Toast';
import '../styles/UploadDocumentButton.css';

interface UploadDocumentButtonProps {
  messageText: string;
}

// Keywords that trigger the upload button
const DOCUMENT_KEYWORDS = [
  'document',
  'documents',
  'upload',
  'medical record',
  'medical records',
  'file',
  'files',
  'report',
  'reports',
  'test result',
  'test results',
  'lab result',
  'lab results',
  'prescription',
  'prescriptions',
  'diagnosis',
  'scan',
  'scans',
  'x-ray',
  'mri',
  'ct scan',
  'blood work',
  'pathology',
  'biopsy'
];

function UploadDocumentButton({ messageText }: UploadDocumentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Check if message contains document-related keywords
  const shouldShowButton = (): boolean => {
    const lowerText = messageText.toLowerCase();
    return DOCUMENT_KEYWORDS.some(keyword => lowerText.includes(keyword));
  };

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleUploadComplete = (fileKey: string, fileName: string) => {
    console.log('Upload complete:', fileKey, fileName);
    
    // Show success toast
    setToastMessage(`${fileName} uploaded successfully!`);
    setToastType('success');
    setShowToast(true);
    
    // Keep modal open and button visible - user can close manually
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    
    // Show error toast
    setToastMessage(error);
    setToastType('error');
    setShowToast(true);
  };

  const handleToastClose = () => {
    setShowToast(false);
  };

  // Don't render if no keywords found
  if (!shouldShowButton()) {
    return null;
  }

  return (
    <>
      <div className="upload-document-button-container">
        <button 
          className="upload-document-button"
          onClick={handleClick}
        >
          <svg 
            className="upload-document-button__icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          <span className="upload-document-button__text">Upload Documents</span>
        </button>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="upload-modal-overlay" onClick={handleClose}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="upload-modal-close" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <DocumentUpload 
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast 
          message={toastMessage}
          type={toastType}
          onClose={handleToastClose}
        />
      )}
    </>
  );
}

export default UploadDocumentButton;
