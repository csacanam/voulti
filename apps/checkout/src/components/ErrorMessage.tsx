import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-md w-full text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{t.general.error}</h2>
        <p className="text-gray-400">{message}</p>
      </div>
    </div>
  );
};