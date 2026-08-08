import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys, detectBrowserLanguage, defaultLanguage } from '../locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Deliberately not the old "deramp-language". That key holds a mix of real
// picks and guesses the previous code wrote on first load, and nothing in the
// value says which is which — so every shopper who ever opened a checkout is
// pinned to whatever it guessed then, which is the bug. Retiring the key is
// the only way to let detection run again. It also drops a brand name the
// product no longer uses.
const STORAGE_KEY = 'voulti-lang.chosen';

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * Resolved during the first render, not in an effect.
 *
 * An effect runs after paint, so deciding there means the shopper sees one
 * frame of the wrong language on a page that is asking them for money. There
 * is no server rendering this app, so reading storage while rendering is safe
 * — there is no server output for it to disagree with.
 *
 * Only an explicit pick is stored. Persisting the detected language too would
 * freeze the first guess forever: a shopper who later switches their browser
 * to Spanish would keep reading English with no way to tell why, because a
 * guess is indistinguishable from a choice once saved.
 */
const resolveInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return defaultLanguage;

  const chosen = localStorage.getItem(STORAGE_KEY) as Language | null;
  return chosen && translations[chosen] ? chosen : detectBrowserLanguage();
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  // index.html is served as lang="en". Left that way, Chrome sees English
  // markup full of Spanish and offers to translate it — machine translation
  // layered on top of real translations.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const value: LanguageContextType = {
    language,
    setLanguage: handleSetLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 