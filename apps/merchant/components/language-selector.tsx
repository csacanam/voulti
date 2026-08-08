"use client"

import { Check, Globe } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { supportedLanguages, type Language } from "@/lib/locales"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Endonyms, never translated: someone looking for their own language scans for
// the word they know, not for its name in a language they cannot read.
const LANGUAGE_NAMES: Record<Language, string> = {
  es: "Español",
  en: "English",
}

const LANGUAGE_CODES: Record<Language, string> = {
  es: "ES",
  en: "EN",
}

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Shows the language you are reading, not the one you would switch
            to. A button labelled "EN" over a Spanish page reads as a broken
            translation rather than as a shortcut, and the checkout already
            names the current language — the two apps disagreed. */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label={LANGUAGE_NAMES[language]}
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{LANGUAGE_NAMES[language]}</span>
          <span className="sm:hidden">{LANGUAGE_CODES[language]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className="gap-2 text-sm"
          >
            <Check className={`w-3.5 h-3.5 ${lang === language ? "opacity-100" : "opacity-0"}`} />
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
