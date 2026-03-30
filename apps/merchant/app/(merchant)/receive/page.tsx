"use client"

import { usePrivy } from "@privy-io/react-auth"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Lock, Link as LinkIcon, QrCode, Code } from "lucide-react"

export default function ReceivePage() {
  const { authenticated } = usePrivy()

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to create payment links</p>
          </div>
        </div>
      </Card>
    )
  }

  const features = [
    {
      title: "Payment Links",
      description: "Create payment links and share them anywhere. Fixed amount, optional expiration. Track status at a glance.",
      icon: LinkIcon,
      href: "/receive/links",
      available: true,
    },
    {
      title: "Commerce Link",
      description: "Your permanent checkout URL. Customers enter the amount. Perfect for in-person payments with a QR code.",
      icon: QrCode,
      href: "/receive/commerce-link",
      available: true,
    },
    {
      title: "Developers",
      description: "Programmatic payments via API & webhooks. Coming soon.",
      icon: Code,
      href: "/receive/developers",
      available: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Receive</h1>
        <p className="text-muted-foreground">Choose how you want to receive payments</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.title} href={feature.href}>
              <Card className="p-6 h-full hover:shadow-lg transition-all cursor-pointer hover:border-primary/50">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

