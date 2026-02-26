import { useState } from 'react';
import type { Message, TrialMatch } from '../types/api';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import '../styles/ChatInterface.css';

// TODO: Replace with actual API Gateway endpoint URL
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://your-api-gateway-url.com/chat';

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addUserMessage = (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
  };

  const addAIMessage = (text: string, trialMatches?: TrialMatch[]) => {
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text,
      trialMatches,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  };

  const handleSendMessage = async (text: string) => {
    // Add user message to conversation
    addUserMessage(text);
    
    // Set loading state
    setIsLoading(true);

    try {
      // Make POST request to API Gateway
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputText: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse JSON response
      let data = await response.json();
      
      // Log the actual response for debugging
      console.log('API Response:', data);

      // Handle AWS Lambda response format where body is a JSON string
      if (data.body && typeof data.body === 'string') {
        data = JSON.parse(data.body);
        console.log('Parsed body:', data);
      }

      // Check if we have a reply field (your API's format)
      if (data.reply && typeof data.reply === 'string') {
        // Your API returns a formatted text reply, just display it
        addAIMessage(data.reply);
      } else {
        // Fallback: try to find trial matches in various formats
        let matches: TrialMatch[] = [];
        
        if (data.matches && Array.isArray(data.matches)) {
          matches = data.matches;
        } else if (Array.isArray(data)) {
          matches = data;
        } else if (data.trials && Array.isArray(data.trials)) {
          matches = data.trials;
        } else if (data.results && Array.isArray(data.results)) {
          matches = data.results;
        } else {
          console.error('Unexpected response format:', data);
          throw new Error('Invalid response format');
        }

        const responseText = matches.length > 0
          ? `Found ${matches.length} clinical trial${matches.length > 1 ? 's' : ''} matching your condition:`
          : 'No clinical trials found matching your condition.';
        
        addAIMessage(responseText, matches);
      }

    } catch (error) {
      console.error('API Error:', error);
      
      // Display user-friendly error message
      let errorMessage = 'Unable to fetch trial matches. Please try again.';
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect. Please check your internet connection and try again.';
      } else if (error instanceof Error && error.message.includes('HTTP error')) {
        const status = error.message.match(/\d+/)?.[0];
        if (status && parseInt(status) >= 500) {
          errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
        } else if (status && parseInt(status) >= 400) {
          errorMessage = 'Invalid request. Please try a different search.';
        }
      } else if (error instanceof Error && error.message === 'Invalid response format') {
        errorMessage = 'Unexpected response format. Please try again.';
      }
      
      addAIMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}

export default ChatInterface;
