import { es } from "./es"
import { en } from "./en"

export const translations = { es, en }

export type Language = keyof typeof translations
export type TranslationKeys = typeof es

export const supportedLanguages: Language[] = ["es", "en"]
export const defaultLanguage: Language = "en"

export function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return defaultLanguage

  // navigator.language is only the first entry of navigator.languages, so
  // reading it alone gives up as soon as the top preference is a language we
  // do not have. A merchant whose list is [fr-FR, es-CO, en] wanted Spanish
  // before English and used to get English.
  const preferences = navigator.languages?.length ? navigator.languages : [navigator.language]

  for (const preference of preferences) {
    const tag = preference.toLowerCase()

    if (supportedLanguages.includes(tag as Language)) {
      return tag as Language
    }

    // 'es-419' and 'es-CO' are both Spanish to us.
    const base = tag.split("-")[0]
    if (supportedLanguages.includes(base as Language)) {
      return base as Language
    }
  }

  return defaultLanguage
}
