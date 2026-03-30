"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Copy, Check, ExternalLink } from "lucide-react"
import type { PaymentLink } from "@/lib/types"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

interface CreatePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLink: (link: PaymentLink) => void
}

export function CreatePaymentLinkDialog({ open, onOpenChange, onCreateLink }: CreatePaymentLinkDialogProps) {
  const { toast } = useToast()
  const { commerce } = useCommerce()
  const [amount, setAmount] = useState("")
  const currency = commerce?.currency || "USD"
  const [enableExpiration, setEnableExpiration] = useState(false)
  const [expirationDate, setExpirationDate] = useState("")
  const [expirationTime, setExpirationTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdLink, setCreatedLink] = useState<{ url: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!commerce) return

    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a positive amount", variant: "destructive" })
      return
    }

    if (enableExpiration && (!expirationDate || !expirationTime)) {
      toast({ title: "Invalid Expiration", description: "Please provide both date and time", variant: "destructive" })
      return
    }

    if (enableExpiration) {
      const expDt = new Date(`${expirationDate}T${expirationTime}`)
      if (expDt <= new Date()) {
        toast({ title: "Invalid Expiration", description: "Expiration must be in the future", variant: "destructive" })
        return
      }
    }

    setLoading(true)

    try {
      const body: any = {
        commerce_id: commerce.commerce_id,
        amount_fiat: Number.parseFloat(amount),
      }

      if (enableExpiration) {
        body.expires_at = new Date(`${expirationDate}T${expirationTime}`).toISOString()
      }

      const res = await fetch(`${API_CONFIG.BASE_URL}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create invoice")
      }

      const { data: invoice } = await res.json()
      const checkoutUrl = `${CHECKOUT_BASE_URL}/checkout/${invoice.id}`

      setCreatedLink({ url: checkoutUrl, id: invoice.id })

      const newLink: PaymentLink = {
        id: invoice.id,
        title: `${invoice.fiat_currency} ${invoice.amount_fiat}`,
        currency: invoice.fiat_currency,
        amount: invoice.amount_fiat,
        status: "active",
        created: invoice.created_at,
        expires: invoice.expires_at || undefined,
        uses: 0,
        url: checkoutUrl,
      }

      onCreateLink(newLink)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!createdLink) return
    navigator.clipboard.writeText(createdLink.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setAmount("")
    setEnableExpiration(false)
    setExpirationDate("")
    setExpirationTime("")
    setCreatedLink(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{createdLink ? "Payment Link Created" : "New Payment Link"}</DialogTitle>
        </DialogHeader>

        {createdLink ? (
          /* Success state — show link */
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-3">Invoice created successfully</p>
              <div className="bg-background border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Checkout URL</p>
                <p className="text-sm font-mono break-all">{createdLink.url}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy URL"}
              </Button>
              <Button variant="outline" asChild>
                <a href={createdLink.url} target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open
                </a>
              </Button>
            </div>

            <Button variant="outline" onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">{currency}</div>
                <p className="text-xs text-muted-foreground">Based on your account settings</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expiration">Enable expiration</Label>
                  <Switch id="expiration" checked={enableExpiration} onCheckedChange={setEnableExpiration} disabled={loading} />
                </div>

                {enableExpiration && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="exp-date">Date</Label>
                      <Input id="exp-date" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exp-time">Time</Label>
                      <Input id="exp-time" type="time" value={expirationTime} onChange={(e) => setExpirationTime(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating..." : "Create Invoice"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
