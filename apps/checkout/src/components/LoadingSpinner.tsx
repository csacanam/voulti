import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LoadingSpinner: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        <p className="text-gray-500">{t.general.loading}</p>
      </div>
    </div>
  );
};
