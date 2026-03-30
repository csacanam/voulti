"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog"
import { Copy, Link as LinkIcon, Lock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import type { PaymentLink } from "@/lib/types"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

function formatTimeRemaining(expires: string): string {
  const diff = new Date(expires).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m left`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h left`
  const days = Math.floor(hours / 24)
  return `${days}d left`
}

export default function PaymentLinksPage() {
  const { authenticated } = usePrivy()
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Load invoices from backend
  useEffect(() => {
    if (!commerce?.commerce_id) {
      setLoadingLinks(false)
      return
    }

    const fetchInvoices = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/invoices/by-commerce/${commerce.commerce_id}`)
        if (!res.ok) throw new Error("Failed to fetch invoices")
        const data = await res.json()
        const invoices = data.data || data || []

        const paymentLinks: PaymentLink[] = invoices.map((inv: any) => {
          let status: "active" | "expired" | "disabled" = "active"
          if (inv.status === "Expired" || (inv.expires_at && new Date(inv.expires_at) < new Date())) {
            status = "expired"
          } else if (inv.status === "Paid") {
            status = "disabled"
          }

          return {
            id: inv.id,
            title: `${inv.fiat_currency} ${inv.amount_fiat}`,
            currency: inv.fiat_currency,
            amount: inv.amount_fiat,
            status,
            created: inv.created_at,
            expires: inv.expires_at || undefined,
            uses: inv.status === "Paid" ? 1 : 0,
            url: `${CHECKOUT_BASE_URL}/checkout/${inv.id}`,
          }
        })

        setLinks(paymentLinks)
      } catch {
        // silently fail, show empty
      } finally {
        setLoadingLinks(false)
      }
    }

    fetchInvoices()
  }, [commerce?.commerce_id])

  const handleCreateLink = (link: PaymentLink) => {
    setLinks([link, ...links])
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copied",
      description: "Payment link URL copied to clipboard",
    })
  }

  const filteredLinks = links.filter((link) => statusFilter === "all" || link.status === statusFilter)

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

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Active", variant: "default" },
    expired: { label: "Expired", variant: "secondary" },
    disabled: { label: "Paid", variant: "outline" },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Links</h1>
          <p className="text-muted-foreground">Create and manage payment links</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
          <LinkIcon className="w-4 h-4" />
          New Payment Link
        </Button>
      </div>

      {loadingLinks ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="w-6 h-6" />
        </div>
      ) : links.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <LinkIcon className="w-12 h-12" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No links yet</h3>
              <p className="text-sm mb-4">Create your first payment link.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                Create Payment Link
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Expires</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLinks.map((link) => {
                    const statusInfo = statusConfig[link.status]
                    return (
                      <tr key={link.id} className="hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">
                            {link.currency} {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{link.id.slice(0, 8)}...</div>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(link.created).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {link.expires ? formatTimeRemaining(link.expires) : "—"}
                        </td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(link.url)} className="gap-1.5">
                            <Copy className="w-4 h-4" />
                            Copy
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <CreatePaymentLinkDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateLink={handleCreateLink}
      />
    </div>
  )
}




