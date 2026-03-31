import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CheckoutPage } from './components/CheckoutPage';
import { CommercePage } from './components/CommercePage';
import { HomePage } from './components/HomePage';
import { DemoPage } from './components/DemoPage';
import { LanguageProvider } from './contexts/LanguageContext';

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="py-4 text-center text-xs text-gray-500">
      <p>
        &copy; Voulti {year} &middot; A{' '}
        <a href="https://sakalabs.xyz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors">
          Saka Labs
        </a>{' '}
        product
      </p>
    </footer>
  );
}

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/checkout/:invoiceId" element={<CheckoutPage />} />
              <Route path="/pay/:commerceId" element={<CommercePage />} />
              <Route path="/checkout" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
