import { useState } from 'react';
import type { FormEvent } from 'react';
import '../styles/ChatInput.css';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
}

function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    
    if (trimmedValue && !disabled) {
      onSendMessage(trimmedValue);
      setInputValue('');
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input__field"
        placeholder="Enter a medical condition..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        aria-label="Medical condition input"
      />
      <button
        type="submit"
        className="chat-input__button"
        disabled={disabled || !inputValue.trim()}
        aria-label="Send message"
      >
        Send
      </button>
    </form>
  );
}

export default ChatInput;
