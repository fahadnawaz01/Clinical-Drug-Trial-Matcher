import { useEffect, useRef } from 'react';
import type { Message, TrialMatch, FormField } from '../types/api';
import MessageBubble from './MessageBubble';
import '../styles/ChatWindow.css';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  pollingProgress?: { current: number; max: number; message: string } | null;
  onCheckFit?: (trial: TrialMatch) => void;
  onFormSubmit?: (answers: Record<string, string | number | boolean>, fields: FormField[]) => void;
}

function ChatWindow({ messages, isLoading, pollingProgress, onCheckFit, onFormSubmit }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, pollingProgress]);

  return (
    <div className="chat-window">
      <div className="chat-window__messages">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onCheckFit={onCheckFit}
            onFormSubmit={onFormSubmit}
          />
        ))}
        {isLoading && (
          <div className="chat-window__loading">
            {pollingProgress ? (
              <div className="chat-window__progress">
                <div className="chat-window__progress-message">
                  {pollingProgress.message}
                </div>
                <div className="chat-window__progress-bar-container">
                  <div 
                    className="chat-window__progress-bar"
                    style={{ width: `${(pollingProgress.current / pollingProgress.max) * 100}%` }}
                  />
                </div>
                <div className="chat-window__progress-text">
                  {Math.round((pollingProgress.current / pollingProgress.max) * 100)}% complete
                </div>
              </div>
            ) : (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatWindow;
