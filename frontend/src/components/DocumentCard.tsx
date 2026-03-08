import { useTranslation } from 'react-i18next';
import type { DocumentMetadata } from '../types/api';
import '../styles/DocumentCard.css';

interface DocumentCardProps {
  document: DocumentMetadata;
  uploadedAt: Date;
}

function DocumentCard({ document, uploadedAt }: DocumentCardProps) {
  const { t } = useTranslation();
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp as relative time
  const formatTimestamp = (date: Date): string => {
    // Handle case where date might be a string (from localStorage)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return t('chat.just_now');
    if (diffSecs < 60) return t('chat.seconds_ago', { count: diffSecs });
    if (diffMins === 1) return t('chat.minute_ago');
    if (diffMins < 60) return t('chat.minutes_ago', { count: diffMins });
    if (diffHours === 1) return t('chat.hour_ago');
    if (diffHours < 24) return t('chat.hours_ago', { count: diffHours });
    return dateObj.toLocaleDateString();
  };

  // Get file icon based on type
  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  const handleViewDocument = () => {
    if (document.viewUrl) {
      window.open(document.viewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="chat-document-card">
      <span className="chat-document-card__icon">{getFileIcon(document.fileType)}</span>
      <div className="chat-document-card__info">
        <div className="chat-document-card__filename">{document.filename}</div>
        <div className="chat-document-card__meta">
          {formatFileSize(document.fileSize)} • {formatTimestamp(uploadedAt)}
        </div>
      </div>
      {document.viewUrl && (
        <button 
          className="chat-document-card__view-btn"
          onClick={handleViewDocument}
          type="button"
        >
          {t('chat.view_document')}
        </button>
      )}
    </div>
  );
}

export default DocumentCard;
