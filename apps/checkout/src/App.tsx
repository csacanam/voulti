import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CheckoutPage } from './components/CheckoutPage';
import { CommercePage } from './components/CommercePage';
import { HomePage } from './components/HomePage';
import { StatsPage } from './components/StatsPage';
import { ApiDocsPage } from './components/ApiDocsPage';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkout/:invoiceId" element={<CheckoutPage />} />
          <Route path="/pay/:commerceId" element={<CommercePage />} />
          <Route path="/docs" element={<ApiDocsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/demo" element={<Navigate to="/" replace />} />
          <Route path="/checkout" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
