import { useEffect, useState } from 'react';
import '../styles/ImmersionOverlay.css';

interface ImmersionOverlayProps {
  isVisible: boolean;
}

const clinicalMessages = [
  "Dr. Scout is comparing your ASA Class II status...",
  "Analyzing Methotrexate dosage against protocol...",
  "Validating airway parameters...",
  "Checking BMI requirements...",
  "Reviewing medication interactions...",
  "Assessing age eligibility criteria...",
  "Evaluating comorbidity factors...",
  "Cross-referencing lab values...",
];

function ImmersionOverlay({ isVisible }: ImmersionOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % clinicalMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="immersion-overlay">
      <div className="immersion-overlay__content">
        {/* DNA Helix Animation */}
        <div className="immersion-overlay__animation">
          <svg
            className="immersion-overlay__dna"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className="immersion-overlay__dna-strand"
              d="M 10 50 Q 30 20, 50 50 T 90 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className="immersion-overlay__dna-strand"
              d="M 10 50 Q 30 80, 50 50 T 90 50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                className="immersion-overlay__dna-rung"
                x1={20 + i * 15}
                y1={50 - Math.sin(i) * 20}
                x2={20 + i * 15}
                y2={50 + Math.sin(i) * 20}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>

        {/* Clinical Logic Feed */}
        <div className="immersion-overlay__message">
          {clinicalMessages[currentMessageIndex]}
        </div>
      </div>
    </div>
  );
}

export default ImmersionOverlay;
