import { useState, useEffect, useRef } from 'react';
import type { Message, TrialMatch, FormField } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getSessionId } from '../utils/sessionManager';
import { useTranslation } from 'react-i18next';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import ImmersionOverlay from '../components/ImmersionOverlay';
import '../styles/ChatInterface.css';

// TODO: Replace with actual API Gateway endpoint URL
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'https://your-api-gateway-url.com/chat';

function ChatInterface() {
  const { t, i18n } = useTranslation();
  // Persist messages in localStorage so they don't disappear when navigating
  // syncAcrossComponents is false by default - we don't need it for messages
  const [messages, setMessages] = useLocalStorage<Message[]>('chatMessages', []);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // For "Check My Fit" immersion overlay
  const [sessionId] = useState(() => {
    const id = getSessionId();
    console.log('🆔 ChatInterface initialized with sessionId:', id);
    return id;
  });
  const [preferredLanguage, setPreferredLanguage] = useState(i18n.language || 'en');
  
  // Search-First UI state: Track if user has started a conversation
  const [hasStarted, setHasStarted] = useState(messages.length > 0);
  
  // Track latest suggestions for floating display - persist in localStorage
  const [latestSuggestions, setLatestSuggestions] = useLocalStorage<string[]>('latestSuggestions', []);
  
  // Track cumulative token usage for this session
  const [cumulativeTokens, setCumulativeTokens] = useState({ input: 0, output: 0, total: 0 });
  
  // Track message count to prevent token limit issues
  const MESSAGE_LIMIT = 20; // After 20 messages, suggest clearing chat
  const TOKEN_WARNING_THRESHOLD = 150000; // Warn at 150K tokens (75% of 200K limit)
  
  // Initialize suggestions from last AI message on mount - limit to 3
  useEffect(() => {
    if (messages.length > 0) {
      const lastAIMessage = [...messages].reverse().find(m => m.sender === 'ai' && m.suggestions);
      if (lastAIMessage?.suggestions) {
        setLatestSuggestions(lastAIMessage.suggestions.slice(0, 3));
      }
      
      // Check if we're approaching token limit
      if (messages.length >= MESSAGE_LIMIT) {
        console.warn(`⚠️ Message count (${messages.length}) approaching limit. Consider clearing chat to avoid token limit errors.`);
      }
    }
  }, []);
  
  // Listen for suggestion clicks from MessageBubble
  useEffect(() => {
    const handleSuggestionClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        handleSendMessage(customEvent.detail);
      }
    };
    
    window.addEventListener('sendSuggestion', handleSuggestionClick);
    return () => window.removeEventListener('sendSuggestion', handleSuggestionClick);
  }, []);

  // Sync preferredLanguage with i18n language changes
  useEffect(() => {
    setPreferredLanguage(i18n.language);
  }, [i18n.language]);
  
  // Polling state
  const pollingIntervalRef = useRef<number | null>(null);
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
    setHasStarted(true); // Transition to chat state
  };

  const addAIMessage = (text: string, trials?: TrialMatch[], condition?: string, suggestions?: string[], tokenUsage?: any, uiForm?: any[], fitScoreProvisional?: number, finalAssessment?: any) => {
    console.log('📝 addAIMessage called with:', {
      text: text ? text.substring(0, 50) : '(undefined)',
      trialsCount: trials?.length,
      suggestionsCount: suggestions?.length,
      hasUiForm: !!uiForm,
      hasFitScoreProvisional: fitScoreProvisional !== undefined,
      hasFinalAssessment: !!finalAssessment,
      finalAssessment: finalAssessment
    });
    
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text,
      trials,
      suggestions,
      condition,
      tokenUsage,
      ui_form: uiForm,
      fit_score_provisional: fitScoreProvisional,
      final_assessment: finalAssessment,
      timestamp: new Date(),
    };
    
    console.log('💾 Saving message to localStorage:', aiMessage);
    setMessages((prev) => [...prev, aiMessage]);
    
    // Update cumulative token usage
    if (tokenUsage) {
      setCumulativeTokens(prev => ({
        input: prev.input + (tokenUsage.inputTokens || 0),
        output: prev.output + (tokenUsage.outputTokens || 0),
        total: prev.total + (tokenUsage.totalTokens || tokenUsage.inputTokens + tokenUsage.outputTokens || 0)
      }));
      console.log('📊 Token usage for this message:', tokenUsage);
      console.log('📊 Cumulative token usage:', {
        input: cumulativeTokens.input + (tokenUsage.inputTokens || 0),
        output: cumulativeTokens.output + (tokenUsage.outputTokens || 0),
        total: cumulativeTokens.total + (tokenUsage.totalTokens || tokenUsage.inputTokens + tokenUsage.outputTokens || 0)
      });
    }
    
    // Update floating suggestions - limit to 3
    console.log('🎯 Suggestions received:', suggestions);
    if (suggestions && suggestions.length > 0) {
      const limited = suggestions.slice(0, 3);
      console.log('✅ Setting latestSuggestions (limited to 3):', limited);
      setLatestSuggestions(limited);
    } else {
      console.log('⚠️ No suggestions to set');
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      setLatestSuggestions([]);
      setCumulativeTokens({ input: 0, output: 0, total: 0 });
      setHasStarted(false);
      
      // Clear sessionId to start fresh conversation
      window.localStorage.removeItem('trialScout_sessionId');
      console.log('🗑️ SessionId cleared - new session will be created on next message');
      
      // Force page reload to get new sessionId
      window.location.reload();
    }
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
    networkRetriesRef.current = 0;
  };

  const startPolling = (fileName: string) => {
    console.log('🔄 Starting polling for file:', fileName);
    currentFileNameRef.current = fileName;
    pollAttemptsRef.current = 0;
    networkRetriesRef.current = 0;
    
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
    setHasStarted(true); // Transition to chat state
    
    // Add AI response message
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: t('chat.analyzing_document'),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);
    
    // Activate loading state
    setIsLoading(true);
    
    // Start polling for document processing
    startPolling(file.name);
  };

  const handleCheckFit = async (trial: TrialMatch) => {
    console.log('🎯 Check My Fit clicked for trial:', trial.trial_id);
    
    // Activate immersion overlay
    setIsAnalyzing(true);
    
    // Determine trial identifier based on trial type
    let trialIdentifier: string | undefined;
    
    // Check if it's a CTRI trial (trial_id starts with "CTRI")
    if (trial.trial_id && trial.trial_id.toUpperCase().startsWith('CTRI')) {
      // For CTRI trials, send the URL
      trialIdentifier = trial.details_url || trial.trialUrl;
      console.log('🇮🇳 CTRI trial detected, using URL:', trialIdentifier);
    } else {
      // For NCT trials, send the trial ID
      trialIdentifier = trial.trial_id || trial.nct_id;
      console.log('🌐 NCT trial detected, using ID:', trialIdentifier);
    }
    
    if (!trialIdentifier) {
      console.error('❌ No trial identifier found');
      setIsAnalyzing(false);
      addAIMessage('Unable to check fit: Trial identifier missing.');
      return;
    }
    
    // Fetch patient profile from localStorage
    let patientProfile = null;
    try {
      const profileData = window.localStorage.getItem('patientProfile');
      if (profileData) {
        patientProfile = JSON.parse(profileData);
        console.log('📋 Patient profile loaded:', patientProfile);
      } else {
        console.warn('⚠️ No patient profile found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading patient profile:', error);
    }
    
    // Construct the inputText with pre-screening command
    const profileString = patientProfile 
      ? JSON.stringify(patientProfile, null, 2)
      : 'No patient profile available';
    
    const inputText = `Please conduct a medical pre-screening for Trial: ${trialIdentifier}. 

Patient Profile:
${profileString}`;
    
    console.log('📤 Sending pre-screening request:', inputText);
    
    try {
      // Make POST request to the same chat endpoint
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputText,
          sessionId,
          preferredLanguage: 'en' // CRITICAL: Force English for pre-screening
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data = await response.json();
      
      // Handle Lambda response format
      if (data.body && typeof data.body === 'string') {
        data = JSON.parse(data.body);
      }
      
      // Handle double-encoded JSON
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      
      console.log('✅ Check Fit Response:', data);
      
      // ============================================
      // Handle 202 Accepted (Async Job Processing)
      // ============================================
      // Check both HTTP status and body statusCode (Lambda can return 200 with statusCode: 202 in body)
      if ((response.status === 202 || data.statusCode === 202)) {
        console.log('⏰ Received 202 Accepted - starting async job polling');
        console.log('📝 Job ID:', data.jobId);
        
        if (data.jobId) {
          // Start polling for job completion (keep immersion overlay active)
          await startTrialFitJobPolling(data.jobId);
          return; // Exit early - polling will handle the rest
        }
      }
      
      // End immersion overlay (only for fast path)
      setIsAnalyzing(false);
      
      // Add AI message with the response
      addAIMessage(
        data.reply,
        data.trials,
        undefined,
        data.suggestions,
        data.tokenUsage,
        data.ui_form,
        data.fit_score_provisional,
        data.final_assessment
      );
      
    } catch (error) {
      console.error('❌ Check Fit Error:', error);
      setIsAnalyzing(false);
      addAIMessage('Unable to check fit. Please try again.');
    }
  };

  const handleFormSubmit = async (answers: Record<string, string | number | boolean>, fields: FormField[]) => {
    console.log('📝 Form submitted with answers:', answers);
    console.log('📝 Form fields:', fields);
    
    // Format answers with their corresponding questions
    const formattedAnswers = fields
      .map(field => {
        const answer = answers[field.id];
        return `Q: ${field.label}\nA: ${answer}`;
      })
      .join('\n\n');
    
    const inputText = `Give eligibility score. Here are my answers to the screening questions:\n\n${formattedAnswers}`;
    
    console.log('📤 Sending formatted answers:', inputText);
    
    // Send the answers to the agent as a hidden system message (won't show in chat)
    await handleSendMessage(inputText, true);
  };

  // ============================================
  // Trial Fit Job Polling (Async Job Processing)
  // ============================================
  const startTrialFitJobPolling = async (jobId: string) => {
    console.log('🔄 Starting Trial Fit job polling for:', jobId);
    
    let pollCount = 0;
    let consecutiveErrors = 0;
    const MAX_POLLS = 30; // 90 seconds at 3-second intervals
    const POLL_INTERVAL_MS = 3000; // 3 seconds
    const MAX_CONSECUTIVE_ERRORS = 3;
    
    const pollJob = async (): Promise<boolean> => {
      pollCount++;
      console.log(`📊 Poll attempt ${pollCount}/${MAX_POLLS} for job ${jobId}`);
      
      // Timeout check
      if (pollCount > MAX_POLLS) {
        console.error('⏱️ Polling timeout reached (90 seconds)');
        setIsLoading(false);
        setIsAnalyzing(false);
        addAIMessage('⚠️ Complex analysis in progress. Dr. Scout will notify you when the results are ready.');
        return false; // Stop polling
      }
      
      try {
        const response = await fetch(
          `${API_ENDPOINT}/context-status?jobId=${encodeURIComponent(jobId)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        consecutiveErrors = 0; // Reset on successful request
        
        console.log('📥 Job polling response:', data);
        
        if (data.status === 'complete') {
          console.log('✅ Job completed!');
          setIsLoading(false);
          setIsAnalyzing(false);
          
          // Extract result from polling response
          const result = data.result || {};
          
          // Safety check: Ensure we have at least a reply
          if (!result.reply) {
            console.error('❌ Job completed but no reply in result:', result);
            addAIMessage('Analysis completed but no response was generated. Please try again.');
            return false; // Stop polling
          }
          
          // Add AI message with the result
          addAIMessage(
            result.reply,
            result.trials,
            undefined,
            result.suggestions,
            result.tokenUsage,
            result.ui_form,
            result.fit_score_provisional,
            result.final_assessment
          );
          
          return false; // Stop polling
          
        } else if (data.status === 'error' || data.status === 'not_found') {
          console.error('❌ Job error:', data.error);
          setIsLoading(false);
          setIsAnalyzing(false);
          addAIMessage(`❌ Analysis failed: ${data.error || 'Unknown error'}. Please try again.`);
          return false; // Stop polling
          
        } else if (data.status === 'processing') {
          console.log('⏳ Job still processing...');
          return true; // Continue polling
        }
        
        return true; // Continue polling by default
        
      } catch (error) {
        console.error('🔴 Job polling error:', error);
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error('🚫 Max consecutive errors reached');
          setIsLoading(false);
          setIsAnalyzing(false);
          addAIMessage('❌ Service Temporarily Busy. Please check your internet connection and try again.');
          return false; // Stop polling
        }
        
        return true; // Continue polling
      }
    };
    
    // Start polling loop
    const intervalId = setInterval(async () => {
      const shouldContinue = await pollJob();
      if (!shouldContinue) {
        clearInterval(intervalId);
      }
    }, POLL_INTERVAL_MS);
    
    // Initial poll (don't wait for first interval)
    const shouldContinue = await pollJob();
    if (!shouldContinue) {
      clearInterval(intervalId);
    }
  };

  const handleSendMessage = async (text: string, isHiddenSystemMessage: boolean = false) => {
    // Check if we're at message limit or token limit and warn user
    if (!isHiddenSystemMessage) {
      if (messages.length >= MESSAGE_LIMIT) {
        const shouldClear = window.confirm(
          `You've sent ${messages.length} messages in this conversation. To avoid errors, we recommend starting a new conversation. Clear chat now?`
        );
        if (shouldClear) {
          handleClearChat();
          return;
        }
      } else if (cumulativeTokens.total >= TOKEN_WARNING_THRESHOLD) {
        const shouldClear = window.confirm(
          `This conversation has used ${cumulativeTokens.total.toLocaleString()} tokens (${Math.round(cumulativeTokens.total / 2000)}% of limit). To avoid errors, we recommend starting a new conversation. Clear chat now?`
        );
        if (shouldClear) {
          handleClearChat();
          return;
        }
      }
    }
    
    // Clear suggestions when user sends a new message
    setLatestSuggestions([]);
    
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
    console.log('🌐 Sending preferredLanguage:', preferredLanguage);
    
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
          sessionId,
          preferredLanguage
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse JSON response
      let data = await response.json();
      
      console.log('🔵 Raw API Response:', data);
      console.log('🔵 Response HTTP status:', response.status);
      console.log('🔵 Response body statusCode:', data.statusCode);
      
      // ============================================
      // NEW: Handle 202 Accepted (Async Job Processing)
      // ============================================
      // Check both HTTP status and body statusCode (Lambda can return 200 with statusCode: 202 in body)
      if ((response.status === 202 || data.statusCode === 202)) {
        // Parse body if it's a string
        let parsedData = data;
        if (data.body && typeof data.body === 'string') {
          try {
            parsedData = JSON.parse(data.body);
          } catch (e) {
            console.error('❌ Failed to parse 202 response body:', e);
          }
        }
        
        if (parsedData.jobId) {
          console.log('⏰ Received 202 Accepted - starting async job polling');
          console.log('📝 Job ID:', parsedData.jobId);
          
          // Start polling for job completion
          await startTrialFitJobPolling(parsedData.jobId);
          return; // Exit early - polling will handle the rest
        }
      }
      
      // Log the actual response for debugging
      console.log('🔵 Raw API Response:', data);
      console.log('🔵 Response type:', typeof data);
      console.log('🔵 Has body?', !!data.body);
      console.log('🔵 Has reply?', !!data.reply);

      // Check for Lambda timeout error
      if (data.errorType === 'Sandbox.Timedout') {
        throw new Error('Lambda timeout: The backend is taking too long to respond. This usually means the AI agent or database query is slow.');
      }

      // Handle AWS Lambda response format where body is a JSON string
      if (data.body && typeof data.body === 'string') {
        try {
          data = JSON.parse(data.body);
          console.log('🟢 Parsed Lambda body:', data);
        } catch (e) {
          console.error('❌ Failed to parse Lambda body:', e);
        }
      }

      // CRITICAL: Check if the entire response is a JSON string (sometimes API Gateway double-encodes)
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
          console.log('🟡 Response was a JSON string, parsed:', data);
        } catch (e) {
          console.error('❌ Failed to parse response string:', e);
        }
      }

      // Check if we have a reply field (new API format with multilingual support)
      if (data.reply !== undefined) {
        console.log('✅ Reply found:', data.reply);
        
        // CRITICAL FIX: Check if reply contains markdown-wrapped JSON
        let replyText = data.reply;
        let trialsArray = data.trials;
        
        // If reply is a string and contains markdown code blocks with JSON
        if (typeof replyText === 'string' && replyText.includes('```')) {
          console.log('⚠️ Reply contains markdown code blocks, extracting JSON...');
          
          // SIMPLE FIX: Just remove the backticks and "json" keyword
          let cleanedText = replyText.trim();
          
          // Remove opening ```json or ```
          if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.substring(7); // Remove ```json
          } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.substring(3); // Remove ```
          }
          
          // Remove closing ```
          if (cleanedText.endsWith('```')) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
          }
          
          cleanedText = cleanedText.trim();
          
          try {
            // CRITICAL: Escape literal newlines before parsing
            const jsonSafeText = cleanedText.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            const extractedJson = JSON.parse(jsonSafeText);
            console.log('✅ Extracted JSON from markdown:', extractedJson);
            
            // Use the extracted reply and trials
            if (extractedJson.reply) {
              replyText = extractedJson.reply;
            }
            if (extractedJson.trials && Array.isArray(extractedJson.trials)) {
              trialsArray = extractedJson.trials;
            }
          } catch (e) {
            console.error('❌ Failed to parse extracted JSON:', e);
            // Keep original values if parsing fails
          }
        }
        
        console.log('📋 Final reply text:', typeof replyText === 'string' ? replyText.substring(0, 100) : replyText);
        console.log('📋 Final trials array:', trialsArray);
        console.log('🔍 Is trials an array?', Array.isArray(trialsArray));
        console.log('📊 Trials length:', trialsArray?.length);
        
        // Ensure reply is a string (not an object)
        const finalReplyText = typeof replyText === 'string' ? replyText : JSON.stringify(replyText);
        
        // Check if trials array exists and is valid
        if (trialsArray && Array.isArray(trialsArray) && trialsArray.length > 0) {
          console.log('✨ Adding AI message with', trialsArray.length, 'trials');
          // Extract condition from the reply text if available (e.g., "found X trials for diabetes")
          const conditionFromReply = extractConditionFromReply(finalReplyText) || condition;
          // New format: reply + trials array + suggestions + tokenUsage + ui_form + fit_score_provisional + final_assessment
          addAIMessage(
            finalReplyText, 
            trialsArray, 
            conditionFromReply, 
            data.suggestions, 
            data.tokenUsage,
            data.ui_form,
            data.fit_score_provisional,
            data.final_assessment
          );
        } else {
          console.log('⚠️ No trials array found or empty, adding reply only');
          // Just reply text (clarifying question or no trials found) + suggestions + tokenUsage + ui_form + fit_score_provisional + final_assessment
          addAIMessage(
            finalReplyText, 
            undefined, 
            undefined, 
            data.suggestions, 
            data.tokenUsage,
            data.ui_form,
            data.fit_score_provisional,
            data.final_assessment
          );
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

  // Debug logging
  console.log('🔍 Debug - hasStarted:', hasStarted, 'latestSuggestions:', latestSuggestions);
  
  return (
    <div className="chat-interface">
      {!hasStarted ? (
        /* Welcome Screen - Empty State */
        <div className={`chat-interface__welcome ${hasStarted ? 'chat-interface__welcome--hidden' : ''}`}>
          <div className="chat-interface__welcome-content">
            <h1 className="chat-interface__welcome-title">Welcome to Trial-Scout</h1>
            <p className="chat-interface__welcome-subtitle">
              Discover clinical trials in India and globally, tailored to your medical needs
            </p>
            
            {/* Suggestion Grid */}
            <div className="chat-interface__suggestions">
              <button 
                className="chat-interface__suggestion-card"
                onClick={() => handleSendMessage("Find recruiting Liver Disease trials in India")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="chat-interface__suggestion-icon"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="chat-interface__suggestion-text">Find recruiting Liver disease trials in India</span>
              </button>
              
              <button 
                className="chat-interface__suggestion-card"
                onClick={() => handleSendMessage("Analyze my uploaded medical document for matches")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="chat-interface__suggestion-icon"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <circle cx="12" cy="13" r="2" />
                  <path d="M12 15v5" />
                </svg>
                <span className="chat-interface__suggestion-text">Analyze my uploaded medical document for matches</span>
              </button>
              
              <button 
                className="chat-interface__suggestion-card"
                onClick={() => handleSendMessage("Show me clinical trials available at AIIMS Delhi")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="chat-interface__suggestion-icon"
                >
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
                <span className="chat-interface__suggestion-text">Show me clinical trials available at AIIMS Delhi</span>
              </button>
              
              <button 
                className="chat-interface__suggestion-card"
                onClick={() => handleSendMessage("What are the eligibility criteria for Kidney disease trials?")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="chat-interface__suggestion-icon"
                >
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <path d="M9 12h6" />
                  <path d="M9 16h6" />
                </svg>
                <span className="chat-interface__suggestion-text">What are the eligibility criteria for Kidney disease trials?</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chat State - Message Thread */
        <div className={`chat-interface__chat-view ${hasStarted ? 'chat-interface__chat-view--visible' : ''}`}>
          <ChatWindow 
            messages={messages} 
            isLoading={isLoading} 
            onCheckFit={handleCheckFit}
            onFormSubmit={handleFormSubmit}
          />
        </div>
      )}
      
      {/* Immersion Overlay for "Check My Fit" */}
      <ImmersionOverlay isVisible={isAnalyzing} />
      
      {/* Floating Clear Chat Button - Always visible when chat started */}
      {hasStarted && (
        <>
          <button 
            className="chat-interface__floating-clear-btn"
            onClick={handleClearChat}
            title={t('chat.clear_chat')}
            aria-label={t('chat.clear_chat')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="chat-interface__broom-icon"
            >
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </button>
          
          {/* Token Usage Indicator */}
          {cumulativeTokens.total > 0 && (
            <div 
              className="chat-interface__token-indicator"
              style={{
                position: 'fixed',
                bottom: '90px',
                right: '20px',
                background: cumulativeTokens.total >= TOKEN_WARNING_THRESHOLD ? '#ff6b6b' : '#4a90e2',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                cursor: 'help'
              }}
              title={`Input: ${cumulativeTokens.input.toLocaleString()} | Output: ${cumulativeTokens.output.toLocaleString()}`}
            >
              📊 {cumulativeTokens.total.toLocaleString()} / 200K tokens ({Math.round(cumulativeTokens.total / 2000)}%)
            </div>
          )}
        </>
      )}
      
      {/* Floating Suggestions - POC */}
      {hasStarted && latestSuggestions && latestSuggestions.length > 0 && (() => {
        console.log('🎨 Rendering floating suggestions:', latestSuggestions);
        return (
        <div className="chat-interface__floating-suggestions">
          {latestSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="chat-interface__floating-suggestion-chip"
              onClick={() => handleSendMessage(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        );
      })()}
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
      />
    </div>
  );
}

export default ChatInterface;
