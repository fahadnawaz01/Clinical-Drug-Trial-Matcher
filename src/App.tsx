import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ChatInterface from './pages/ChatInterface';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="app-container">
          <nav className="nav-placeholder">
            {/* Navigation placeholder for future expansion */}
          </nav>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatInterface />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
