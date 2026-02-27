import type { SavedTrial } from '../types/api';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/SavedTrials.css';

function SavedTrials() {
  const [savedTrials, setSavedTrials] = useLocalStorage<SavedTrial[]>('savedTrials', [], { syncAcrossComponents: true });

  const removeTrial = (nctId: string) => {
    setSavedTrials(savedTrials.filter((trial) => trial.nct_id !== nctId));
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
        <h2 className="saved-trials__title">Matched Trials</h2>
        <div className="saved-trials__empty">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="saved-trials__empty-icon"
          >
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
          </svg>
          <h3 className="saved-trials__empty-title">No trials saved yet</h3>
          <p className="saved-trials__empty-text">
            Go to chat to find matches and save trials that interest you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-trials">
      <div className="saved-trials__header">
        <h2 className="saved-trials__title">Matched Trials</h2>
        <p className="saved-trials__count">{savedTrials.length} trial{savedTrials.length !== 1 ? 's' : ''} saved</p>
      </div>

      {sortedConditions.map((condition) => (
        <div key={condition} className="saved-trials__section">
          <h3 className="saved-trials__section-title">
            {condition}
            <span className="saved-trials__section-count">
              {groupedTrials[condition].length} trial{groupedTrials[condition].length !== 1 ? 's' : ''}
            </span>
          </h3>
          
          <div className="saved-trials__list">
            {groupedTrials[condition].map((trial) => (
              <div key={trial.nct_id || trial.id} className="saved-trial-card">
                <div className="saved-trial-card__header">
                  <div className="saved-trial-card__header-content">
                    <h4 className="saved-trial-card__title">{trial.trial_name}</h4>
                    {trial.nct_id && (
                      <p className="saved-trial-card__nct">NCT ID: {trial.nct_id}</p>
                    )}
                  </div>
                  <button
                    className="saved-trial-card__remove"
                    onClick={() => removeTrial(trial.nct_id || trial.id)}
                    aria-label="Remove trial"
                    title="Remove from saved"
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
                {trial.status && (
                  <span className="saved-trial-card__status">{trial.status}</span>
                )}
                <p className="saved-trial-card__summary">{trial.summary}</p>
                <div className="saved-trial-card__footer">
                  <span className="saved-trial-card__date">
                    Saved {new Date(trial.savedAt).toLocaleDateString()}
                  </span>
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
