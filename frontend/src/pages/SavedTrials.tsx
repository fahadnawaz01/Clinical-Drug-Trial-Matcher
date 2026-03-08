import { useTranslation } from 'react-i18next';
import type { SavedTrial } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/SavedTrials.css';

function SavedTrials() {
  const { t } = useTranslation();
  const [savedTrials, setSavedTrials] = useLocalStorage<SavedTrial[]>('savedTrials', [], { syncAcrossComponents: true });

  const removeTrial = (trialId: string) => {
    setSavedTrials(savedTrials.filter((trial) => trial.trial_id !== trialId));
  };

  // Group trials by condition/disease
  const groupedTrials = savedTrials.reduce((groups, trial) => {
    const condition = trial.condition || 'Uncategorized';
    if (!groups[condition]) {
      groups[condition] = [];
    }
    groups[condition].push(trial);
    return groups;
  }, {} as Record<string, SavedTrial[]>);

  // Sort conditions alphabetically
  const sortedConditions = Object.keys(groupedTrials).sort();

  if (savedTrials.length === 0) {
    return (
      <div className="saved-trials">
        <h2 className="saved-trials__title">{t('navbar.matched_trials')}</h2>
        <div className="saved-trials__empty">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="saved-trials__empty-icon"
          >
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
          <h3 className="saved-trials__empty-title">{t('trials.no_trials_saved')}</h3>
          <p className="saved-trials__empty-text">
            {t('trials.go_to_chat')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-trials">
      <div className="saved-trials__header">
        <h2 className="saved-trials__title">{t('navbar.matched_trials')}</h2>
        <p className="saved-trials__count">
          {savedTrials.length === 1 
            ? t('trials.trial_count', { count: savedTrials.length })
            : t('trials.trial_count_plural', { count: savedTrials.length })
          }
        </p>
      </div>

      {sortedConditions.map((condition) => (
        <div key={condition} className="saved-trials__section">
          <h3 className="saved-trials__section-title">
            {condition}
            <span className="saved-trials__section-count">
              {groupedTrials[condition].length === 1
                ? t('trials.trial_count', { count: groupedTrials[condition].length })
                : t('trials.trial_count_plural', { count: groupedTrials[condition].length })
              }
            </span>
          </h3>
          
          <div className="saved-trials__list">
            {groupedTrials[condition].map((trial) => (
              <div key={trial.trial_id || trial.id} className="saved-trial-card">
                <div className="saved-trial-card__header">
                  <div className="saved-trial-card__header-content">
                    <h4 className="saved-trial-card__title">{trial.trial_name}</h4>
                    {trial.status && (
                      <span className="saved-trial-card__status">{trial.status}</span>
                    )}
                  </div>
                  <button
                    className="saved-trial-card__remove"
                    onClick={() => removeTrial(trial.trial_id || trial.id)}
                    aria-label={t('trials.remove_trial')}
                    title={t('trials.remove_trial')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="saved-trial-card__remove-icon"
                    >
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
                
                {trial.trial_id && (
                  <p className="saved-trial-card__nct">{t('trials.nct_id')}: {trial.trial_id}</p>
                )}
                
                {trial.location && (
                  <p className="saved-trial-card__location">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="saved-trial-card__location-icon"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {trial.location}
                  </p>
                )}
                
                <p className="saved-trial-card__summary">{trial.summary}</p>
                
                <div className="saved-trial-card__footer">
                  <span className="saved-trial-card__date">
                    {t('trials.saved_on', { date: new Date(trial.savedAt).toLocaleDateString() })}
                  </span>
                  
                  {trial.details_url && (
                    <a
                      href={trial.details_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="saved-trial-card__details-btn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="saved-trial-card__details-icon"
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SavedTrials;
