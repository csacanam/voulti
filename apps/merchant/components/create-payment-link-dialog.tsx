"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { PaymentLink, PaymentLinkCurrency } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface CreatePaymentLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateLink: (link: PaymentLink) => void
}

export function CreatePaymentLinkDialog({ open, onOpenChange, onCreateLink }: CreatePaymentLinkDialogProps) {
  const { toast } = useToast()
  const [currency, setCurrency] = useState<PaymentLinkCurrency>("USD")
  const [amount, setAmount] = useState("")
  const [enableExpiration, setEnableExpiration] = useState(false)
  const [expirationDate, setExpirationDate] = useState("")
  const [expirationTime, setExpirationTime] = useState("")

  const handleCreate = () => {
    // Validation
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount",
        variant: "destructive",
      })
      return
    }

    if (enableExpiration) {
      if (!expirationDate || !expirationTime) {
        toast({
          title: "Invalid Expiration",
          description: "Please provide both date and time for expiration",
          variant: "destructive",
        })
        return
      }

      const expirationDateTime = new Date(`${expirationDate}T${expirationTime}`)
      if (expirationDateTime <= new Date()) {
        toast({
          title: "Invalid Expiration",
          description: "Expiration must be in the future",
          variant: "destructive",
        })
        return
      }
    }

    // Create link
    const newLink: PaymentLink = {
      id: `link-${Date.now()}`,
      title: `${currency} ${amount}`,
      currency,
      amount: Number.parseFloat(amount),
      status: "active",
      created: new Date().toISOString(),
      expires: enableExpiration ? new Date(`${expirationDate}T${expirationTime}`).toISOString() : undefined,
      uses: 0,
      url: `https://pay.voulti.com/${currency.toLowerCase()}/${amount}/${Date.now()}`,
    }

    onCreateLink(newLink)

    // Copy to clipboard
    navigator.clipboard.writeText(newLink.url)

    toast({
      title: "Payment link created",
      description: "URL copied to clipboard.",
    })

    // Reset form
    setAmount("")
    setEnableExpiration(false)
    setExpirationDate("")
    setExpirationTime("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Payment Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as PaymentLinkCurrency)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="COP">COP</SelectItem>
                <SelectItem value="MXN">MXN</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Currency used to charge the customer.</p>
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
            />
            <p className="text-xs text-muted-foreground">Enter a positive amount.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiration">Enable expiration</Label>
              <Switch id="expiration" checked={enableExpiration} onCheckedChange={setEnableExpiration} />
            </div>

            {enableExpiration && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expiration-date">Date</Label>
                  <Input
                    id="expiration-date"
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration-time">Time</Label>
                  <Input
                    id="expiration-time"
                    type="time"
                    value={expirationTime}
                    onChange={(e) => setExpirationTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            {enableExpiration && (
              <p className="text-xs text-muted-foreground">
                After this date/time the link won't accept payments.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




