"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import {
  translations,
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_MAX_AGE,
  type Language,
  type TranslationKeys,
} from "@/lib/locales"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode
  /**
   * Resolved on the server from the cookie, falling back to Accept-Language.
   * The provider does not detect anything itself: the server knew before it
   * rendered, and a second detection path here could only disagree with the
   * HTML that already painted.
   */
  initialLanguage: Language
}) {
  const [language, setLang] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Carries over the picks made in the few hours when the choice lived in
  // localStorage. Safe to delete once those visitors have come back once.
  useEffect(() => {
    if (document.cookie.includes(`${LANGUAGE_COOKIE}=`)) return

    const stranded = localStorage.getItem(LANGUAGE_COOKIE) as Language | null
    if (stranded && translations[stranded]) {
      setLanguage(stranded)
      localStorage.removeItem(LANGUAGE_COOKIE)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLang(lang)
    // Not httpOnly: the client is what writes it. Lax is enough — reading it
    // wrong costs a language, not an account.
    document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`
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
