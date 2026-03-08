import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = event.target.value;
    console.log('🌐 Language dropdown changed to:', newLanguage);
    console.log('🌐 Current i18n language before change:', i18n.language);
    i18n.changeLanguage(newLanguage).then(() => {
      console.log('✅ Language changed successfully to:', i18n.language);
      console.log('✅ localStorage i18nextLng:', localStorage.getItem('i18nextLng'));
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="main-layout">
      {/* Top Navigation Bar */}
      <header className="main-layout__header">
        <button
          className="main-layout__hamburger"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="main-layout__hamburger-icon"
          >
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <h1 className="main-layout__title">{t('navbar.title')}</h1>
        <select 
          className="main-layout__language-selector"
          value={i18n.language}
          onChange={handleLanguageChange}
          aria-label="Select language"
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="mr">मराठी</option>
          <option value="bn">বাংলা</option>
          <option value="ta">தமிழ்</option>
          <option value="te">తెలుగు</option>
        </select>
        {/* Debug: Show current language */}
        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
          ({i18n.language})
        </span>
      </header>

      {/* Sidebar Drawer */}
      <div
        className={`main-layout__overlay ${isSidebarOpen ? 'main-layout__overlay--visible' : ''}`}
        onClick={closeSidebar}
      />
      <aside className={`main-layout__sidebar ${isSidebarOpen ? 'main-layout__sidebar--open' : ''}`}>
        <nav className="main-layout__nav">
          <Link
            to="/chat"
            className={`main-layout__nav-link ${isActive('/chat') ? 'main-layout__nav-link--active' : ''}`}
            onClick={closeSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="main-layout__nav-icon"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            {t('navbar.new_consultation')}
          </Link>
          <Link
            to="/profile"
            className={`main-layout__nav-link ${isActive('/profile') ? 'main-layout__nav-link--active' : ''}`}
            onClick={closeSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="main-layout__nav-icon"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            {t('navbar.patient_profile')}
          </Link>
          <Link
            to="/saved-trials"
            className={`main-layout__nav-link ${isActive('/saved-trials') ? 'main-layout__nav-link--active' : ''}`}
            onClick={closeSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="main-layout__nav-icon"
            >
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
            </svg>
            {t('navbar.matched_trials')}
          </Link>
          <Link
            to="/documents"
            className={`main-layout__nav-link ${isActive('/documents') ? 'main-layout__nav-link--active' : ''}`}
            onClick={closeSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="main-layout__nav-icon"
            >
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
            </svg>
            {t('navbar.documents')}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-layout__content">
        {children}
      </main>
    </div>
  );
}

export default MainLayout;
