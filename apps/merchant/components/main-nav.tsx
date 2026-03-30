"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Receipt, Activity, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"

// TEMPORARY: Only Payouts menu visible for development
// To restore all menus, see docs/TEMPORARY_CONFIG.md
const navItems = [
  // { href: "/", label: "Home", icon: Home }, // HIDDEN: Temporarily disabled
  // { href: "/receive", label: "Receive", icon: QrCode }, // HIDDEN: Temporarily disabled
  { href: "/payouts", label: "Payouts", icon: Receipt },
  // { href: "/activity", label: "Activity", icon: Activity }, // HIDDEN: Temporarily disabled
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
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


