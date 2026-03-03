import { useState, useEffect, useRef } from 'react';
import type { Message, TrialMatch } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getSessionId, getMemoryId } from '../utils/sessionManager';
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
  const [sessionId] = useState(() => getSessionId()); // Current conversation thread
  const [memoryId] = useState(() => getMemoryId()); // Long-term patient identity
  
  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollAttemptsRef = useRef(0);
  const networkRetriesRef = useRef(0);
  const currentFileNameRef = useRef<string>('');
  
  // Polling configuration
  const MAX_POLL_ATTEMPTS = 40; // 2 minutes at 3-second intervals
  const POLL_INTERVAL = 3000; // 3 seconds
  const MAX_NETWORK_RETRIES = 3;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Extract condition from user's message (simple keyword extraction)
  const extractCondition = (text: string): string => {
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
    return text.length < 50 ? text : 'your condition';
  };

  // Extract condition from agent's reply (more reliable than user input)
  const extractConditionFromReply = (reply: string): string | null => {
    // Pattern: "found X trials for [condition]"
    const patterns = [
      /trials?\s+for\s+([a-z0-9\s]+?)(?:\.|,|!|$|in|at)/i,
      /matching\s+([a-z0-9\s]+?)(?:\.|,|!|$|in|at)/i,
      /treating\s+([a-z0-9\s]+?)(?:\.|,|!|$|in|at)/i,
    ];
    
    for (const pattern of patterns) {
      const match = reply.match(pattern);
      if (match && match[1]) {
        const condition = match[1].trim();
        // Filter out common words that aren't conditions
        if (!['your', 'the', 'a', 'an', 'this', 'that'].includes(condition.toLowerCase())) {
          return condition.replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
        }
      }
    }
    
    return null;
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

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    pollAttemptsRef.current = 0;
    networkRetriesRef.current = 0;
  };

  const startPolling = (fileName: string) => {
    console.log('🔄 Starting polling for file:', fileName);
    currentFileNameRef.current = fileName;
    pollAttemptsRef.current = 0;
    networkRetriesRef.current = 0;
    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current++;
      
      console.log(`📊 Poll attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}`);
      
      // Timeout check
      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        console.error('⏱️ Polling timeout reached');
        stopPolling();
        setIsLoading(false);
        addAIMessage('⚠️ Document processing is taking longer than expected. Please try uploading again or contact support if the issue persists.');
        return;
      }
      
      try {
        const response = await fetch(
          `${API_ENDPOINT}/context-status?sessionId=${sessionId}&expectedFileName=${encodeURIComponent(fileName)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        networkRetriesRef.current = 0; // Reset on successful request
        
        console.log('📥 Polling response:', data);
        
        if (data.status === 'complete') {
          console.log('✅ Document processing complete!');
          stopPolling();
          
          // Trigger hidden prompt to AI agent
          const profileSummary = JSON.stringify(data.profile, null, 2);
          const hiddenPrompt = `System: The user just uploaded a new medical document. The patient's updated clinical profile is:\n\n${profileSummary}\n\nAcknowledge this and search for relevant clinical trials based on their medical conditions.`;
          
          console.log('🤖 Triggering AI agent with hidden prompt');
          
          // Send hidden prompt to AI (this will maintain loading state until AI responds)
          await handleSendMessage(hiddenPrompt, true); // true = hidden system message
          
        } else if (data.status === 'error') {
          console.error('❌ Document processing error:', data.error);
          stopPolling();
          setIsLoading(false);
          addAIMessage(`❌ Document processing failed: ${data.error || 'Unknown error'}. Please try uploading again.`);
          
        } else if (data.status === 'processing') {
          console.log('⏳ Still processing...');
          // Continue polling
        }
        
      } catch (error) {
        console.error('🔴 Polling request error:', error);
        networkRetriesRef.current++;
        
        if (networkRetriesRef.current >= MAX_NETWORK_RETRIES) {
          console.error('🚫 Max network retries reached');
          stopPolling();
          setIsLoading(false);
          addAIMessage('❌ Unable to check processing status. Please check your internet connection and try again.');
        }
      }
    }, POLL_INTERVAL);
  };

  const handleFileUpload = (file: File, metadata: { filename: string; fileSize: number; fileType: string; viewUrl: string }) => {
    console.log('📄 File uploaded:', file.name);
    
    // Add a user message to show the document upload
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `Uploaded medical document`,
      document: metadata,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Add AI response message
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: `Analyzing your clinical history...`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
    
    // Activate loading state
    setIsLoading(true);
    
    // Start polling for document processing
    startPolling(file.name);
  };

  const handleSendMessage = async (text: string, isHiddenSystemMessage: boolean = false) => {
    // Check if user is asking to upload documents (more comprehensive pattern)
    const lowerText = text.toLowerCase();
    const uploadKeywords = ['upload', 'attach', 'send', 'share', 'provide', 'submit'];
    const documentKeywords = ['document', 'documents', 'file', 'files', 'record', 'records', 'report', 'reports', 'result', 'results', 'scan', 'scans', 'prescription', 'prescriptions', 'medical record', 'test result', 'lab result'];
    
    const hasUploadKeyword = uploadKeywords.some(keyword => lowerText.includes(keyword));
    const hasDocumentKeyword = documentKeywords.some(keyword => lowerText.includes(keyword));
    const isUploadRequest = hasUploadKeyword && hasDocumentKeyword;
    
    console.log('🔍 Upload detection:', { text, hasUploadKeyword, hasDocumentKeyword, isUploadRequest });
    
    // Add user message to conversation (skip for hidden system messages)
    if (!isHiddenSystemMessage) {
      addUserMessage(text);
    }
    
    // If user is asking to upload documents, show a helpful response without calling API
    if (isUploadRequest && !isHiddenSystemMessage) {
      console.log('✅ Upload request detected - skipping API call');
      addAIMessage("Sure! You can upload your medical documents using the paperclip icon (📎) in the chat input below. Supported formats: PDF, JPEG, PNG (max 10 MB).");
      return; // Don't call the API
    }
    
    console.log('📞 Making API call for:', text);
    
    // Extract condition from user's query
    const condition = extractCondition(text);
    
    // Set loading state (if not already set by polling)
    if (!isLoading) {
      setIsLoading(true);
    }

    try {
      // Make POST request to API Gateway
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inputText: text,
          sessionId, // Current conversation thread (for DynamoDB profile)
          memoryId   // Long-term patient identity (for Bedrock Agent Memory)
        }),
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
          // Extract condition from the reply text if available (e.g., "found X trials for diabetes")
          const conditionFromReply = extractConditionFromReply(data.reply) || condition;
          // New format: reply + trials array
          addAIMessage(data.reply, data.trials, conditionFromReply);
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
          {isPolling && (
            <button 
              className="chat-interface__cancel-btn"
              onClick={() => {
                stopPolling();
                setIsLoading(false);
                addAIMessage('Document processing cancelled. You can upload again when ready.');
              }}
              title="Cancel document processing"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="chat-interface__cancel-icon"
              >
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
              </svg>
              Cancel Processing
            </button>
          )}
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
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

export default ChatInterface;
