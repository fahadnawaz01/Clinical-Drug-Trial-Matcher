import type { Message, TrialMatch, FormField } from '../types/api';
import ChatTrialCard from './ChatTrialCard';
import DocumentCard from './DocumentCard';
import DynamicForm from './DynamicForm';
import AssessmentResult from './AssessmentResult';
import '../styles/MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  onCheckFit?: (trial: TrialMatch) => void;
  onFormSubmit?: (answers: Record<string, string | number | boolean>, fields: FormField[]) => void;
}

function MessageBubble({ message, onCheckFit, onFormSubmit }: MessageBubbleProps) {
  // Parse trials from text if the message contains JSON (for retroactive fixing)
  let displayText = message.text;
  let displayTrials = message.trials;
  
  // Skip parsing for old malformed messages - just display as-is
  // Only try to parse if message doesn't already have trials and looks like complete JSON
  if (message.sender === 'ai' && typeof message.text === 'string' && !message.trials) {
    // Only attempt parsing if the text looks like it might be complete JSON
    // Skip if it contains backticks (old format that's likely truncated)
    const hasBackticks = message.text.includes('```');
    const looksLikeCompleteJson = message.text.trim().startsWith('{') && message.text.trim().endsWith('}');
    
    if (!hasBackticks && looksLikeCompleteJson && message.text.includes('"trials"')) {
      try {
        const parsed = JSON.parse(message.text);
        
        if (parsed.reply) {
          displayText = parsed.reply;
        }
        if (parsed.trials && Array.isArray(parsed.trials)) {
          displayTrials = parsed.trials;
        }
      } catch (e) {
        // Silently fail - just display the original text
        // This handles old malformed messages gracefully
      }
    }
  }
  
  return (
    <>
      {/* Main message bubble with text */}
      <div className={`message-bubble message-bubble--${message.sender}`}>
        <div className={`message-bubble__content ${message.document ? 'message-bubble__content--document' : ''}`}>
          {/* Render document card if present */}
          {message.document && (
            <DocumentCard document={message.document} uploadedAt={message.timestamp} />
          )}
          
          <p className="message-bubble__text">{displayText}</p>
          
          {/* Render trials only if there's no form or assessment */}
          {displayTrials && displayTrials.length > 0 && !message.ui_form && !message.final_assessment && (
            <div className="message-bubble__trials">
              {displayTrials.map((trial, index) => (
                <ChatTrialCard 
                  key={trial.trial_id || `trial-${index}`} 
                  trial={trial}
                  condition={message.condition}
                  onCheckFit={onCheckFit}
                />
              ))}
            </div>
          )}
          
          {/* Render dynamic form if present */}
          {message.ui_form && message.ui_form.length > 0 && (
            <DynamicForm
              fields={message.ui_form}
              provisionalScore={message.fit_score_provisional}
              onSubmit={(answers, fields) => onFormSubmit?.(answers, fields)}
            />
          )}
        </div>
      </div>
      
      {/* Render final assessment as separate card */}
      {message.final_assessment && (
        <div className={`message-bubble message-bubble--${message.sender} message-bubble--assessment`}>
          <AssessmentResult assessment={message.final_assessment} />
        </div>
      )}
    </>
  );
}

export default MessageBubble;
