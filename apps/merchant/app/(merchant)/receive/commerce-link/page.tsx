"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { QrModal } from "@/components/qr-modal"
import { Copy, QrCode, Lock, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function CommerceLinkPage() {
  const { authenticated, user } = usePrivy()
  const { toast } = useToast()
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)

  const commerceUrl = `https://pay.voulti.com/@${user?.wallet?.address?.slice(0, 8) || "user"}`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(commerceUrl)
    toast({
      title: "URL copied",
      description: "Commerce URL copied to clipboard",
    })
  }

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to access your commerce link</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Commerce Link</h1>
        <p className="text-muted-foreground">Your permanent checkout URL for accepting payments</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Your Commerce URL</h3>
            <div className="flex gap-2">
              <Input value={commerceUrl} readOnly className="font-mono text-sm" />
              <Button onClick={handleCopyUrl} variant="outline" className="gap-2">
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
          </div>

          <div>
            <Button onClick={() => setIsQrModalOpen(true)} variant="default" className="gap-2">
              <QrCode className="w-4 h-4" />
              Show QR Code
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use this for in-person payments or generic checkouts.</li>
              <li>
                You can pass an optional amount parameter, e.g.{" "}
                <code className="bg-background px-1 py-0.5 rounded text-xs">?amount=25</code>
              </li>
              <li>Keep this link visible at the counter or print the QR code.</li>
            </ul>
          </div>
        </div>
      </Card>

      <QrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} url={commerceUrl} />
    </div>
  )
}




