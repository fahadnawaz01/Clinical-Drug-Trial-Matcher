import type { Message } from '../types/api';
import TrialCard from './TrialCard';
import '../styles/MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <div className={`message-bubble message-bubble--${message.sender}`}>
      <div className="message-bubble__content">
        <p className="message-bubble__text">{message.text}</p>
        {message.trialMatches && message.trialMatches.length > 0 && (
          <div className="message-bubble__trials">
            {message.trialMatches.map((trial, index) => (
              <TrialCard key={`${message.id}-trial-${index}`} trial={trial} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;
