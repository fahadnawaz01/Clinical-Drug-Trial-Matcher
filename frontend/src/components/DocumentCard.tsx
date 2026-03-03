import type { DocumentMetadata } from '../types/api';
import '../styles/DocumentCard.css';

interface DocumentCardProps {
  document: DocumentMetadata;
  uploadedAt: Date;
}

function DocumentCard({ document, uploadedAt }: DocumentCardProps) {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format timestamp as relative time
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
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
    <div className="document-card">
      <div className="document-card__header">
        <span className="document-card__icon">{getFileIcon(document.fileType)}</span>
        <div className="document-card__info">
          <div className="document-card__filename">{document.filename}</div>
          <div className="document-card__meta">
            {formatFileSize(document.fileSize)} • Uploaded {formatTimestamp(uploadedAt)}
          </div>
        </div>
      </div>
      {document.viewUrl && (
        <button 
          className="document-card__view-btn"
          onClick={handleViewDocument}
          type="button"
        >
          View Document →
        </button>
      )}
    </div>
  );
}

export default DocumentCard;
