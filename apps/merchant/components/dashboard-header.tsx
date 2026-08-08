"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wallet, LogOut, User, Building2 } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { LanguageSelector } from "@/components/language-selector"
import { MainNav } from "@/components/main-nav"

export function DashboardHeader() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { commerce } = useCommerce()
  const { t } = useLanguage()

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo + Nav */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            {/* Same mark as the checkout and the public site. It was a bare
                wordmark here, so the dashboard did not read as the same
                product the merchant's customers are looking at. */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">V</span>
              </div>
              <span className="text-lg font-bold text-foreground">Voulti</span>
            </Link>

            {authenticated && (
              <div className="hidden sm:block">
                <MainNav />
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {authenticated && commerce && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground">
                <Building2 className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{commerce.name}</span>
              </div>
            )}

            <LanguageSelector />

            {authenticated && (
              <Link href="/account">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.header.account}</span>
                </Button>
              </Link>
            )}

            {authenticated ? (
              <Button onClick={logout} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.header.logout}</span>
              </Button>
            ) : (
              <Button onClick={login} size="sm" className="gap-2" disabled={!ready}>
                <Wallet className="w-4 h-4" />
                {ready ? t.header.getStarted : t.header.loading}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
