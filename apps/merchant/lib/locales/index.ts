import { es } from "./es"
import { en } from "./en"

export const translations = { es, en }

export type Language = keyof typeof translations
export type TranslationKeys = typeof es

export const supportedLanguages: Language[] = ["es", "en"]
export const defaultLanguage: Language = "en"

/**
 * Where an explicit pick lives.
 *
 * A cookie rather than localStorage because the server has to read it. The
 * language has to be decided before the first byte of HTML — anywhere later
 * and the merchant watches the page change language after it paints.
 */
export const LANGUAGE_COOKIE = "voulti-lang.chosen"
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Pick the first supported language in an ordered list of BCP-47 tags. */
function firstSupported(tags: readonly string[]): Language | null {
  for (const raw of tags) {
    const tag = raw.toLowerCase()

    if (supportedLanguages.includes(tag as Language)) {
      return tag as Language
    }

    // 'es-419' and 'es-CO' are both Spanish to us.
    const base = tag.split("-")[0]
    if (supportedLanguages.includes(base as Language)) {
      return base as Language
    }
  }

  return null
}

/**
 * Resolve a language from an Accept-Language header.
 *
 * This is the same ordered preference list the browser later exposes to JS as
 * navigator.languages — but it arrives with the request, which is the only
 * point where the flash can actually be prevented rather than corrected.
 *
 * Returns null when the header is absent or names nothing we speak, so the
 * caller decides what "no answer" means.
 */
export function negotiateLanguage(acceptLanguage: string | null | undefined): Language | null {
  if (!acceptLanguage) return null

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";")
      const q = parameters.find((p) => p.trim().startsWith("q="))
      const weight = q ? Number.parseFloat(q.trim().slice(2)) : 1
      // A malformed q is worth nothing rather than everything, so a broken
      // entry cannot outrank the well-formed ones around it.
      return { tag: tag.trim(), weight: Number.isNaN(weight) ? 0 : weight }
    })
    // q=0 means "explicitly not this one".
    .filter((entry) => entry.tag && entry.weight > 0)
    // Stable sort, so equal weights keep the order the browser sent them in.
    .sort((a, b) => b.weight - a.weight)

  return firstSupported(ranked.map((entry) => entry.tag))
}
