import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supportedLanguages, Language } from '../locales';

interface LanguageSelectorProps {
  className?: string;
}

const languageNames: Record<Language, string> = {
  es: 'Español',
  en: 'English'
};

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="appearance-none bg-gray-800/90 backdrop-blur-sm border border-gray-600 text-white text-sm rounded-lg pl-8 pr-4 py-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:bg-gray-700/90 transition-colors"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
      <Globe className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}; 