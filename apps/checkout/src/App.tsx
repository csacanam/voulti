import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CheckoutPage } from './components/CheckoutPage';
import { CommercePage } from './components/CommercePage';
import { HomePage } from './components/HomePage';
import { DemoPage } from './components/DemoPage';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/checkout/:invoiceId" element={<CheckoutPage />} />
          <Route path="/pay/:commerceId" element={<CommercePage />} />
          <Route path="/checkout" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;