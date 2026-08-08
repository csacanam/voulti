"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, detectBrowserLanguage, defaultLanguage, type Language, type TranslationKeys } from "@/lib/locales"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Deliberately not the old "voulti-lang". That key holds a mix of real picks
// and guesses the previous code wrote on first load, and nothing in the value
// says which is which — so every merchant who ever opened the dashboard is
// pinned to whatever it guessed then, which is the bug. Retiring the key is
// the only way to let detection run again; the cost is one re-pick for the
// merchants who had actually chosen.
const STORAGE_KEY = "voulti-lang.chosen"

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(defaultLanguage)

  useEffect(() => {
    // Only an explicit pick is stored. Persisting the detected language too
    // would freeze the first guess forever: a merchant who later switches
    // their browser to Spanish would keep reading English with no way to tell
    // why, because a guess is indistinguishable from a choice once saved.
    const chosen = localStorage.getItem(STORAGE_KEY) as Language | null
    setLang(chosen && translations[chosen] ? chosen : detectBrowserLanguage())
  }, [])

  // The document is served as lang="en" because the layout is static. Left
  // that way, Chrome sees English markup full of Spanish and offers to
  // translate it — machine translation layered on top of real translations.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (lang: Language) => {
    setLang(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
