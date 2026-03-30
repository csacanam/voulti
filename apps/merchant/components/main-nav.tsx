"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, QrCode, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/providers/language-provider"

export function MainNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const navItems = [
    { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/receive", label: t.nav.receive, icon: QrCode },
    { href: "/payouts", label: t.nav.send, icon: Send },
  ]

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
