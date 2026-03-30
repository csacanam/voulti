"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowDownToLine, Link as LinkIcon, Send, QrCode } from "lucide-react"

export function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      label: "Send",
      icon: Send,
      onClick: () => router.push("/payouts"),
      variant: "outline" as const,
    },
    {
      label: "Deposit",
      icon: ArrowDownToLine,
      onClick: () => {}, // Por ahora no hace nada
      variant: "outline" as const,
    },
    {
      label: "New Payment Link",
      icon: LinkIcon,
      onClick: () => router.push("/receive/links"),
      variant: "outline" as const,
    },
    {
      label: "Show QR",
      icon: QrCode,
      onClick: () => router.push("/receive/commerce-link"),
      variant: "outline" as const,
    },
  ]

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              onClick={action.onClick}
              variant={action.variant}
              className="flex-1 gap-2 cursor-pointer"
              size="lg"
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </Button>
          )
        })}
      </div>
    </Card>
  )
}

