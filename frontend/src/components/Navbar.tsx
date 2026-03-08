import { useTranslation } from 'react-i18next';
import '../styles/Navbar.css';

interface NavbarProps {
  onLanguageChange?: (language: string) => void;
}

function Navbar({ onLanguageChange }: NavbarProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    i18n.changeLanguage(newLanguage);
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        <h1 className="navbar__title">{t('navbar.title')}</h1>
        <div className="navbar__controls">
          <select 
            className="navbar__language-selector"
            value={i18n.language}
            onChange={handleLanguageChange}
            aria-label={t('navbar.language_selector')}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="mr">मराठी (Marathi)</option>
            <option value="bn">বাংলা (Bengali)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="te">తెలుగు (Telugu)</option>
          </select>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
