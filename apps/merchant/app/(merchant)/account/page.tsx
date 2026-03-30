"use client"

import { usePrivy } from "@privy-io/react-auth"
import { useCommerce } from "@/components/providers/commerce-provider"
import { CommerceProfile } from "@/components/commerce-profile"
import { Card } from "@/components/ui/card"
import { Lock, Loader2 } from "lucide-react"

export default function AccountPage() {
  const { authenticated } = usePrivy()
  const { commerce, loading } = useCommerce()

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to view your account</p>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="text-sm">Loading account information...</p>
        </div>
      </Card>
    )
  }

  if (!commerce) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Commerce Found</h3>
            <p className="text-sm">Complete your registration to continue</p>
          </div>
        </div>
      </Card>
    )
  }

  return <CommerceProfile commerce={commerce} />
}

