import { useState, useEffect } from 'react';
import type { Message, TrialMatch } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import '../styles/ChatInterface.css';

// TODO: Replace with actual API Gateway endpoint URL
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://your-api-gateway-url.com/chat';

function ChatInterface() {
  // Persist messages in localStorage so they don't disappear when navigating
  // syncAcrossComponents is false by default - we don't need it for messages
  const [messages, setMessages] = useLocalStorage<Message[]>('chatMessages', []);
  const [isLoading, setIsLoading] = useState(false);

  // Extract condition from user's message (simple keyword extraction)
  const extractCondition = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Common patterns for medical conditions
    const patterns = [
      /(?:i have|diagnosed with|suffering from|living with)\s+([a-z\s]+?)(?:\.|,|$|and|or)/i,
      /(?:trials? for|treating|treatment for)\s+([a-z\s]+?)(?:\.|,|$|and|or)/i,
      /([a-z\s]+?)\s+(?:trials?|treatment|therapy|medication)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
      }
    }
    
    // Fallback: use the whole message if it's short
    if (text.length < 50) {
      return text.trim();
    }
    
    return 'General';
  };

  const addUserMessage = (text: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
  };

  const addAIMessage = (text: string, trials?: TrialMatch[], condition?: string) => {
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text,
      trials,
      condition,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (text: string) => {
    // Check if user is asking to upload documents (more comprehensive pattern)
    const lowerText = text.toLowerCase();
    const uploadKeywords = ['upload', 'attach', 'send', 'share', 'provide', 'submit'];
    const documentKeywords = ['document', 'documents', 'file', 'files', 'record', 'records', 'report', 'reports', 'result', 'results', 'scan', 'scans', 'prescription', 'prescriptions', 'medical record', 'test result', 'lab result'];
    
    const hasUploadKeyword = uploadKeywords.some(keyword => lowerText.includes(keyword));
    const hasDocumentKeyword = documentKeywords.some(keyword => lowerText.includes(keyword));
    const isUploadRequest = hasUploadKeyword && hasDocumentKeyword;
    
    console.log('🔍 Upload detection:', { text, hasUploadKeyword, hasDocumentKeyword, isUploadRequest });
    
    // Add user message to conversation
    addUserMessage(text);
    
    // If user is asking to upload documents, show a helpful response without calling API
    if (isUploadRequest) {
      console.log('✅ Upload request detected - skipping API call');
      addAIMessage("Sure! You can upload your medical documents using the button below. Supported formats: PDF, JPEG, PNG, DOC, DOCX, TXT (max 10 MB).");
      return; // Don't call the API
    }
    
    console.log('📞 Making API call for:', text);
    
    // Extract condition from user's query
    const condition = extractCondition(text);
    
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
      console.log('🔵 Raw API Response:', data);

      // Check for Lambda timeout error
      if (data.errorType === 'Sandbox.Timedout') {
        throw new Error('Lambda timeout: The backend is taking too long to respond. This usually means the AI agent or database query is slow.');
      }

      // Handle AWS Lambda response format where body is a JSON string
      if (data.body && typeof data.body === 'string') {
        data = JSON.parse(data.body);
        console.log('🟢 Parsed Lambda body:', data);
      }

      // Check if reply is also a JSON string (double-encoded)
      if (data.reply && typeof data.reply === 'string' && data.reply.trim().startsWith('{')) {
        try {
          const parsedReply = JSON.parse(data.reply);
          console.log('🟡 Reply was double-encoded, parsed:', parsedReply);
          data = parsedReply;
        } catch (e) {
          console.log('🟠 Reply looks like JSON but failed to parse, using as-is');
        }
      }

      // Check if we have a reply field (new API format)
      if (data.reply && typeof data.reply === 'string') {
        console.log('✅ Reply found:', data.reply);
        console.log('📋 Trials array:', data.trials);
        console.log('🔍 Is trials an array?', Array.isArray(data.trials));
        console.log('📊 Trials length:', data.trials?.length);
        
        // Check if trials array exists
        if (data.trials && Array.isArray(data.trials) && data.trials.length > 0) {
          console.log('✨ Adding AI message with', data.trials.length, 'trials');
          // New format: reply + trials array
          addAIMessage(data.reply, data.trials, condition);
        } else {
          console.log('⚠️ No trials array found or empty, adding reply only');
          // Just reply text (clarifying question or no trials found)
          addAIMessage(data.reply);
        }
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
        
        addAIMessage(responseText, matches, condition);
      }

    } catch (error) {
      console.error('API Error:', error);
      
      // Display user-friendly error message
      let errorMessage = 'Unable to fetch trial matches. Please try again.';
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect. Please check your internet connection and try again.';
      } else if (error instanceof Error && error.message.includes('Lambda timeout')) {
        errorMessage = 'The search is taking longer than expected. The backend may be slow or overloaded. Please try again in a moment, or try a simpler query.';
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
      {messages.length > 0 && (
        <div className="chat-interface__header">
          <button 
            className="chat-interface__clear-btn"
            onClick={handleClearChat}
            title="Clear chat history"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="chat-interface__clear-icon"
            >
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
            Clear Chat
          </button>
        </div>
      )}
      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}

export default ChatInterface;
