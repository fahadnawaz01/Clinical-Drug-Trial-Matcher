import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrialMatch, SavedTrial } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/ChatTrialCard.css';

interface ChatTrialCardProps {
  trial: TrialMatch;
  condition?: string; // The disease/condition from the user's query
  onCheckFit?: (trial: TrialMatch) => void; // Callback for "Check My Fit" action
}

function ChatTrialCard({ trial, condition, onCheckFit }: ChatTrialCardProps) {
  const { t } = useTranslation();
  const [savedTrials, setSavedTrials] = useLocalStorage<SavedTrial[]>('savedTrials', [], { syncAcrossComponents: true });
  const [isSaved, setIsSaved] = useState(false);

  // Sync isSaved state with savedTrials whenever it changes
  useEffect(() => {
    const isCurrentTrialSaved = savedTrials.some((t) => t.trial_id === trial.trial_id);
    console.log(`Trial ${trial.trial_id} - isSaved check:`, isCurrentTrialSaved, 'savedTrials:', savedTrials.map(t => t.trial_id));
    setIsSaved(isCurrentTrialSaved);
  }, [savedTrials, trial.trial_id]);

  const handleSave = () => {
    console.log('Saving trial:', trial.trial_id, 'Current isSaved:', isSaved);
    if (isSaved) {
      // Remove from saved
      const updatedTrials = savedTrials.filter((t) => t.trial_id !== trial.trial_id);
      console.log('Removing trial, updated count:', updatedTrials.length);
      setSavedTrials(updatedTrials);
    } else {
      // Add to saved
      const savedTrial: SavedTrial = {
        ...trial,
        id: trial.trial_id || `trial-${Date.now()}`,
        savedAt: new Date(),
        condition: condition || 'Uncategorized', // Store the condition
      };
      const updatedTrials = [...savedTrials, savedTrial];
      console.log('Adding trial, updated count:', updatedTrials.length);
      setSavedTrials(updatedTrials);
    }
  };
  
  // Determine the details URL: priority is details_url, fallback to constructed URL from nct_id
  const getDetailsUrl = () => {
    if (trial.details_url) {
      return trial.details_url;
    }
    if (trial.nct_id) {
      return `https://clinicaltrials.gov/study/${trial.nct_id}`;
    }
    if (trial.trial_id && trial.trial_id.startsWith('NCT')) {
      return `https://clinicaltrials.gov/study/${trial.trial_id}`;
    }
    return null;
  };
  
  const detailsUrl = getDetailsUrl();

  return (
    <div className="chat-trial-card">
      <div className="chat-trial-card__header">
        <h4 className="chat-trial-card__title">{trial.trial_name}</h4>
        {trial.status && (
          <span className="chat-trial-card__status">{trial.status}</span>
        )}
      </div>
      
      {trial.trial_id && (
        <p className="chat-trial-card__nct">{t('trials.trial_id')}: {trial.trial_id}</p>
      )}
      
      {trial.location && (
        <p className="chat-trial-card__location">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="chat-trial-card__location-icon"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {trial.location}
        </p>
      )}
      
      <p className="chat-trial-card__summary">{trial.summary}</p>
      
      <div className="chat-trial-card__actions">
        <button
          className="chat-trial-card__check-fit-btn"
          onClick={() => onCheckFit?.(trial)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="chat-trial-card__icon"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {t('trials.check_fit')}
        </button>
        
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
              {t('trials.saved')}
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
              {t('trials.save_trial')}
            </>
          )}
        </button>
        
        {detailsUrl && (
          <a
            href={detailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-trial-card__details-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="chat-trial-card__icon"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {t('trials.view_details')}
          </a>
        )}
      </div>
    </div>
  );
}

export default ChatTrialCard;
