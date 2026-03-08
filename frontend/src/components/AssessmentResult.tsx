import { useState } from 'react';
import type { FinalAssessment } from '../types/api';
import '../styles/AssessmentResult.css';

interface AssessmentResultProps {
  assessment: FinalAssessment;
}

function AssessmentResult({ assessment }: AssessmentResultProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('score');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('eligible') && !statusLower.includes('insufficient')) {
      return 'success';
    } else if (statusLower.includes('insufficient') || statusLower.includes('potentially')) {
      return 'warning';
    } else {
      return 'danger';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const statusColor = getStatusColor(assessment.status);
  const scoreColor = getScoreColor(assessment.fit_score);

  return (
    <div className="assessment-result">
      {/* Match Score Section */}
      <div className="assessment-result__section-container">
        <button
          className="assessment-result__section-header"
          onClick={() => toggleSection('score')}
        >
          <div className="assessment-result__section-title-wrapper">
            <svg className="assessment-result__section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 11l3 3 5-5" />
            </svg>
            <span className="assessment-result__section-title">MATCH SCORE</span>
          </div>
          <svg
            className={`assessment-result__chevron ${expandedSection === 'score' ? 'assessment-result__chevron--expanded' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {expandedSection === 'score' && (
          <div className="assessment-result__section-content">
            <div className="assessment-result__score-display">
              <div className={`assessment-result__score-circle assessment-result__score-circle--${scoreColor}`}>
                <span className="assessment-result__score-number">{assessment.fit_score}</span>
              </div>
              <div className="assessment-result__score-info">
                <div className="assessment-result__score-label">FINAL FIT SCORE</div>
                <div className="assessment-result__score-value">{assessment.fit_score}/100</div>
              </div>
              <div className={`assessment-result__status-badge assessment-result__status-badge--${statusColor}`}>
                {assessment.status.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Matching Criteria Section */}
      {assessment.match_reasons && assessment.match_reasons.length > 0 && (
        <div className="assessment-result__section-container">
          <button
            className="assessment-result__section-header"
            onClick={() => toggleSection('criteria')}
          >
            <div className="assessment-result__section-title-wrapper">
              <svg className="assessment-result__section-icon assessment-result__section-icon--success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="assessment-result__section-title">MATCHING CRITERIA</span>
            </div>
            <svg
              className={`assessment-result__chevron ${expandedSection === 'criteria' ? 'assessment-result__chevron--expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expandedSection === 'criteria' && (
            <div className="assessment-result__section-content">
              <ul className="assessment-result__list">
                {assessment.match_reasons.map((reason, index) => (
                  <li key={index} className="assessment-result__list-item assessment-result__list-item--success">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Potential Barriers Section */}
      {assessment.barriers && assessment.barriers.length > 0 && (
        <div className="assessment-result__section-container">
          <button
            className="assessment-result__section-header"
            onClick={() => toggleSection('barriers')}
          >
            <div className="assessment-result__section-title-wrapper">
              <svg className="assessment-result__section-icon assessment-result__section-icon--warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="assessment-result__section-title">POTENTIAL BARRIERS</span>
            </div>
            <svg
              className={`assessment-result__chevron ${expandedSection === 'barriers' ? 'assessment-result__chevron--expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expandedSection === 'barriers' && (
            <div className="assessment-result__section-content">
              <ul className="assessment-result__list">
                {assessment.barriers.map((barrier, index) => (
                  <li key={index} className="assessment-result__list-item assessment-result__list-item--warning">
                    {barrier}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Section */}
      {assessment.recommendations && assessment.recommendations.length > 0 && (
        <div className="assessment-result__section-container">
          <button
            className="assessment-result__section-header"
            onClick={() => toggleSection('recommendations')}
          >
            <div className="assessment-result__section-title-wrapper">
              <svg className="assessment-result__section-icon assessment-result__section-icon--info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="assessment-result__section-title">RECOMMENDATIONS</span>
            </div>
            <svg
              className={`assessment-result__chevron ${expandedSection === 'recommendations' ? 'assessment-result__chevron--expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {expandedSection === 'recommendations' && (
            <div className="assessment-result__section-content">
              <ul className="assessment-result__list">
                {assessment.recommendations.map((recommendation, index) => (
                  <li key={index} className="assessment-result__list-item assessment-result__list-item--info">
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="assessment-result__actions">
        <button className="assessment-result__action-btn assessment-result__action-btn--primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Contact Coordinators
        </button>
        <button className="assessment-result__action-btn assessment-result__action-btn--secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Download Report
        </button>
      </div>
    </div>
  );
}

export default AssessmentResult;
