import { useState, useEffect } from 'react';
import type { TrialMatch, SavedTrial } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/ChatTrialCard.css';

interface ChatTrialCardProps {
  trial: TrialMatch;
  condition?: string; // The disease/condition from the user's query
}

function ChatTrialCard({ trial, condition }: ChatTrialCardProps) {
  const [savedTrials, setSavedTrials] = useLocalStorage<SavedTrial[]>('savedTrials', [], { syncAcrossComponents: true });
  const [isSaved, setIsSaved] = useState(false);

  // Sync isSaved state with savedTrials whenever it changes
  useEffect(() => {
    setIsSaved(savedTrials.some((t) => t.nct_id === trial.nct_id));
  }, [savedTrials, trial.nct_id]);

  const handleSave = () => {
    if (isSaved) {
      // Remove from saved
      const updatedTrials = savedTrials.filter((t) => t.nct_id !== trial.nct_id);
      setSavedTrials(updatedTrials);
    } else {
      // Add to saved
      const savedTrial: SavedTrial = {
        ...trial,
        id: trial.nct_id || `trial-${Date.now()}`,
        savedAt: new Date(),
        condition: condition || 'Uncategorized', // Store the condition
      };
      const updatedTrials = [...savedTrials, savedTrial];
      setSavedTrials(updatedTrials);
    }
  };

  return (
    <div className="chat-trial-card">
      <div className="chat-trial-card__header">
        <h4 className="chat-trial-card__title">{trial.trial_name}</h4>
        {trial.status && (
          <span className="chat-trial-card__status">{trial.status}</span>
        )}
      </div>
      
      {trial.nct_id && (
        <p className="chat-trial-card__nct">NCT ID: {trial.nct_id}</p>
      )}
      
      <p className="chat-trial-card__summary">{trial.summary}</p>
      
      <button
        className={`chat-trial-card__save-btn ${isSaved ? 'chat-trial-card__save-btn--saved' : ''}`}
        onClick={handleSave}
      >
        {isSaved ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="chat-trial-card__icon"
            >
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
            Saved
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="chat-trial-card__icon"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Save Trial
          </>
        )}
      </button>
    </div>
  );
}

export default ChatTrialCard;
