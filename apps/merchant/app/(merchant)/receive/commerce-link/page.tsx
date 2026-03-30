"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { QrModal } from "@/components/qr-modal"
import { Copy, QrCode, Lock, Info, ExternalLink } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useToast } from "@/hooks/use-toast"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

export default function CommerceLinkPage() {
  const { authenticated } = usePrivy()
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const commerceUrl = commerce
    ? `${CHECKOUT_BASE_URL}/pay/${commerce.commerce_id}`
    : ""

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(commerceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "URL copied", description: "Commerce link copied to clipboard" })
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
        <p className="text-muted-foreground">Your permanent checkout page. Customers enter the amount and pay.</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Your Checkout URL</h3>
            <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">{commerceUrl}</div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopyUrl} variant="default" className="gap-2">
              {copied ? "Copied!" : <><Copy className="w-4 h-4" /> Copy URL</>}
            </Button>
            <Button onClick={() => setIsQrModalOpen(true)} variant="outline" className="gap-2">
              <QrCode className="w-4 h-4" />
              QR Code
            </Button>
            <Button variant="outline" asChild>
              <a href={commerceUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="w-4 h-4" />
                Preview
              </a>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Customer opens the link and enters the amount in <strong>{commerce?.currency || "your currency"}</strong></li>
              <li>An invoice is created automatically and they choose how to pay (wallet or address)</li>
              <li>Print the QR code for in-person payments at your counter</li>
              <li>Share the link on your website, social media, or messaging apps</li>
            </ul>
          </div>
        </div>
      </Card>

      <QrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} url={commerceUrl} />
    </div>
  )
}
