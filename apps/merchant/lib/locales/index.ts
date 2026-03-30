import { es } from "./es"
import { en } from "./en"

export const translations = { es, en }

export type Language = keyof typeof translations
export type TranslationKeys = typeof es

export const supportedLanguages: Language[] = ["es", "en"]
export const defaultLanguage: Language = "en"

export function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return defaultLanguage

  const browserLang = navigator.language.toLowerCase()

  if (supportedLanguages.includes(browserLang as Language)) {
    return browserLang as Language
  }

  const baseLang = browserLang.split("-")[0]
  if (supportedLanguages.includes(baseLang as Language)) {
    return baseLang as Language
  }

  return defaultLanguage
}
