"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function BottomNav() {
  const pathname = usePathname()
  const { authenticated } = usePrivy()
  const { t } = useLanguage()

  if (!authenticated) return null

  const items = [
    { href: "/", label: t.nav.dashboard, icon: Home },
    { href: "/receive", label: t.nav.receive, icon: ArrowDownToLine },
    { href: "/payouts", label: t.nav.send, icon: ArrowUpFromLine },
  ]

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
      <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "fill-primary/10")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
