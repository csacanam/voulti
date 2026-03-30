import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LoadingSpinner: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-400">{t.general.loading}</p>
      </div>
    </div>
  );
};