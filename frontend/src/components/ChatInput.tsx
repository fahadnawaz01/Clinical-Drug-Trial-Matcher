import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { getSessionId } from '../utils/sessionManager';
import '../styles/ChatInput.css';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled: boolean;
  onFileUpload?: (file: File, metadata: { filename: string; fileSize: number; fileType: string; viewUrl: string }) => void;
}

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend Window interface for webkit prefix
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function ChatInput({ onSendMessage, disabled, onFileUpload }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStopRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const isListeningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Gateway endpoint
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
    'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher';

  // Keep isListeningRef in sync with isListening state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    // Check if Speech Recognition is supported
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      return;
    }

    // Initialize Speech Recognition
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process only new results starting from resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Accumulate final transcripts to avoid duplicates
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
        setInputValue(finalTranscriptRef.current);
      } else if (interimTranscript) {
        // Show interim results on top of accumulated final results
        setInputValue(finalTranscriptRef.current + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isManualStopRef.current = true;
        alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
      } else if (event.error === 'no-speech') {
        // User didn't speak, but keep listening
        console.log('No speech detected, continuing to listen...');
      } else if (event.error === 'aborted') {
        // Manual abort, don't restart
        console.log('Speech recognition aborted');
      } else {
        console.log(`Speech recognition error: ${event.error}, will retry...`);
      }
    };

    recognition.onend = () => {
      // If user didn't manually stop, restart recognition
      if (isListeningRef.current && !isManualStopRef.current) {
        console.log('Recognition ended, restarting...');
        setTimeout(() => {
          try {
            if (recognitionRef.current && isListeningRef.current) {
              recognitionRef.current.start();
            }
          } catch (error) {
            console.error('Failed to restart recognition:', error);
            setIsListening(false);
          }
        }, 100); // Small delay to prevent rapid restart issues
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        isManualStopRef.current = true;
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Recognition already stopped');
        }
      }
    };
  }, []); // Only run once on mount

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      // User manually stopping
      isManualStopRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsListening(false);
    } else {
      // User starting
      isManualStopRef.current = false;
      finalTranscriptRef.current = inputValue; // Preserve existing text
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error: any) {
        console.error('Failed to start speech recognition:', error);
        // If already started, try stopping first then starting
        if (error.message && error.message.includes('already started')) {
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              if (recognitionRef.current) {
                recognitionRef.current.start();
                setIsListening(true);
              }
            }, 100);
          } catch (retryError) {
            alert('Failed to start microphone. Please refresh the page and try again.');
          }
        } else {
          alert('Failed to start microphone. Please try again.');
        }
      }
    }
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, JPEG, or PNG file.');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds 10 MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB.`);
      return;
    }

    try {
      // Get sessionId
      const sessionId = getSessionId();

      // Step 1: Request pre-signed URL
      const response = await fetch(`${API_ENDPOINT}/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get upload URL: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Parse API Gateway response
      let parsedData = data;
      if (data.statusCode && data.body) {
        parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
      }

      if (!parsedData.uploadUrl) {
        throw new Error('Failed to get upload URL from response');
      }

      // Extract the actual filename from fileKey (e.g., "documents/sessionId/timestamp-random-filename.pdf")
      const actualFileName = parsedData.fileKey ? parsedData.fileKey.split('/').pop() : file.name;
      console.log('📝 Actual filename in S3:', actualFileName);

      // Step 2: Upload to S3
      const uploadResponse = await fetch(parsedData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Generate presigned GET URL for viewing the document
      const viewUrlResponse = await fetch(`${API_ENDPOINT}/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: actualFileName,
          fileType: file.type,
          fileSize: file.size,
          sessionId,
          action: 'get' // Request a GET URL instead of PUT
        })
      });

      let viewUrl = '';
      if (viewUrlResponse.ok) {
        const viewData = await viewUrlResponse.json();
        let parsedViewData = viewData;
        if (viewData.statusCode && viewData.body) {
          parsedViewData = typeof viewData.body === 'string' ? JSON.parse(viewData.body) : viewData.body;
        }
        viewUrl = parsedViewData.uploadUrl || parsedViewData.viewUrl || '';
        console.log('📥 View URL generated:', viewUrl ? 'Success' : 'Failed');
      }

      // Notify parent component with the actual filename and metadata
      if (onFileUpload) {
        // Create a modified file object with the actual filename for polling
        const fileWithActualName = new File([file], actualFileName, { type: file.type });
        const metadata = {
          filename: file.name, // Original filename for display
          fileSize: file.size,
          fileType: file.type,
          viewUrl: viewUrl
        };
        onFileUpload(fileWithActualName, metadata);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('File upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();
    
    // Stop listening if active
    if (isListening && recognitionRef.current) {
      isManualStopRef.current = true;
      recognitionRef.current.stop();
      setIsListening(false);
    }
    
    if (trimmedValue && !disabled) {
      onSendMessage(trimmedValue);
      setInputValue('');
      finalTranscriptRef.current = ''; // Reset transcript accumulator
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input__field"
        placeholder="Enter a medical condition or use the microphone..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={disabled}
        aria-label="Medical condition input"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <button
        type="button"
        className="chat-input__paperclip-button"
        onClick={handlePaperclipClick}
        disabled={disabled}
        aria-label="Upload document"
        title="Upload medical document"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="chat-input__paperclip-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
      </button>
      <button
        type="button"
        className={`chat-input__mic-button ${isListening ? 'chat-input__mic-button--active' : ''}`}
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        title={isListening ? 'Stop recording' : 'Start voice input'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="chat-input__mic-icon"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>
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
