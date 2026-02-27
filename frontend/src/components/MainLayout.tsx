import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

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
        <h1 className="main-layout__title">Trial-Scout</h1>
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
            New Consultation
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
            Patient Profile
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
            Matched Trials
          </Link>
          <Link
            to="/upload"
            className={`main-layout__nav-link ${isActive('/upload') ? 'main-layout__nav-link--active' : ''}`}
            onClick={closeSidebar}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="main-layout__nav-icon"
            >
              <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
            </svg>
            Upload Documents
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
