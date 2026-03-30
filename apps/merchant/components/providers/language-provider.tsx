"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { translations, detectBrowserLanguage, type Language, type TranslationKeys } from "@/lib/locales"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>("en")

  useEffect(() => {
    const saved = localStorage.getItem("voulti-lang") as Language
    if (saved && translations[saved]) {
      setLang(saved)
    } else {
      const detected = detectBrowserLanguage()
      setLang(detected)
      localStorage.setItem("voulti-lang", detected)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLang(lang)
    localStorage.setItem("voulti-lang", lang)
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
