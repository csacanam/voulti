"use client"

import { useLanguage } from "@/components/providers/language-provider"
import { Button } from "@/components/ui/button"

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "es" ? "en" : "es")}
      className="text-xs font-medium text-muted-foreground hover:text-foreground px-2"
    >
      {language === "es" ? "EN" : "ES"}
    </Button>
  )
}
