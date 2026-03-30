"use client"

import { usePrivy } from "@privy-io/react-auth"
import { ActivityList } from "@/components/activity-list"
import { DUMMY_TRANSACTIONS } from "@/lib/dummy-data"
import { Card } from "@/components/ui/card"
import { Lock } from "lucide-react"

export default function ActivityPage() {
  const { authenticated } = usePrivy()

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to view your activity</p>
          </div>
        </div>
      </Card>
    )
  }

  return <ActivityList transactions={DUMMY_TRANSACTIONS} />
}




