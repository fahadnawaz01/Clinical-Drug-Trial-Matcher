import type { TrialMatch } from '../types/api';
import '../styles/TrialCard.css';

interface TrialCardProps {
  trial: TrialMatch;
}

function TrialCard({ trial }: TrialCardProps) {
  return (
    <div className="trial-card">
      <h3 className="trial-card__title">{trial.trial_name}</h3>
      <p className="trial-card__summary">{trial.summary}</p>
    </div>
  );
}

export default TrialCard;
