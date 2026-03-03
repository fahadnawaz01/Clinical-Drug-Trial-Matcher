import type { Message } from '../types/api';
import ChatTrialCard from './ChatTrialCard';
import DocumentCard from './DocumentCard';
import '../styles/MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  // Debug logging
  if (message.sender === 'ai' && message.trials) {
    console.log('🎯 MessageBubble rendering with trials:', message.trials.length, 'trials');
  }
  
  return (
    <div className={`message-bubble message-bubble--${message.sender}`}>
      <div className="message-bubble__content">
        {/* Render document card if present */}
        {message.document && (
          <DocumentCard document={message.document} uploadedAt={message.timestamp} />
        )}
        
        <p className="message-bubble__text">{message.text}</p>
        
        {message.trials && message.trials.length > 0 && (
          <div className="message-bubble__trials">
            {message.trials.map((trial, index) => (
              <ChatTrialCard 
                key={trial.nct_id || `trial-${index}`} 
                trial={trial}
                condition={message.condition}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
