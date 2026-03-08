import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ChatInterface from './pages/ChatInterface';
import PatientProfile from './pages/PatientProfile';
import SavedTrials from './pages/SavedTrials';
import MedicalRecords from './pages/MedicalRecords';
import TestUpload from './components/TestUpload';
import TestUploadAPI from './components/TestUploadAPI';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatInterface />} />
            <Route path="/profile" element={<PatientProfile />} />
            <Route path="/saved-trials" element={<SavedTrials />} />
            <Route path="/documents" element={<MedicalRecords />} />
            <Route path="/test-upload" element={<TestUpload />} />
            <Route path="/test-api" element={<TestUploadAPI />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
