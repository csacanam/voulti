"use client"

import { useLanguage } from "@/components/providers/language-provider"

export function Footer() {
  const year = new Date().getFullYear()
  const { t } = useLanguage()

  return (
    <footer className="hidden sm:block border-t border-border mt-auto py-6">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          {/* The sentence is split around the link because Spanish puts the
              company after the noun ("un producto de X") and English before
              it ("an X product"). */}
          <p>&copy; Voulti {year} &middot; {t.footer.productPrefix} <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">Saka Labs</a>{t.footer.productSuffix && ` ${t.footer.productSuffix}`}</p>
          <p>{t.footer.builtBy} <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors">Saka Labs</a></p>
        </div>
      </div>
    </footer>
  )
}
