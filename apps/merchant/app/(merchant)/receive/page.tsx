"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Copy, Check, Code, Webhook, Key, QrCode, Link as LinkIcon, ExternalLink, Loader2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog"
import { QrModal } from "@/components/qr-modal"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"
import type { PaymentLink } from "@/lib/types"

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

// ─── Payment Links Tab ───
function PaymentLinksTab() {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (!commerce?.commerce_id) { setLoadingLinks(false); return }

    const fetchInvoices = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/invoices/by-commerce/${commerce.commerce_id}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        const invoices = data.data || []

        setLinks(invoices.map((inv: any) => {
          let status: "active" | "expired" | "disabled" = "active"
          if (inv.status === "Expired" || (inv.expires_at && new Date(inv.expires_at) < new Date())) status = "expired"
          else if (inv.status === "Paid") status = "disabled"

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
        }))
      } catch { /* empty */ } finally { setLoadingLinks(false) }
    }
    fetchInvoices()
  }, [commerce?.commerce_id])

  const handleCreateLink = (link: PaymentLink) => setLinks([link, ...links])

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: "URL copied" })
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Pending", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    expired: { label: "Expired", className: "bg-red-500/10 text-red-400 border-red-500/30" },
    disabled: { label: "Paid", className: "bg-green-500/10 text-green-400 border-green-500/30" },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create one-time payment links with a fixed amount</p>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2">
          <LinkIcon className="w-4 h-4" />
          New
        </Button>
      </div>

      {loadingLinks ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
      ) : links.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <LinkIcon className="w-8 h-8" />
            <p className="text-sm">No invoices yet. Create your first one.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" size="sm">Create Invoice</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Created</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Expires</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((link) => {
                  const statusInfo = statusConfig[link.status]
                  return (
                    <tr key={link.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{link.currency} {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-muted-foreground font-mono">{link.id.slice(0, 8)}...</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>{statusInfo.label}</span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(link.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">{link.expires ? formatTimeRemaining(link.expires) : "—"}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(link.url)} className="gap-1.5">
                          <Copy className="w-4 h-4" /> Copy
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreatePaymentLinkDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreateLink={handleCreateLink} />
    </div>
  )
}

// ─── Commerce Link Tab ───
function CommerceLinkTab() {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const commerceUrl = commerce ? `${CHECKOUT_BASE_URL}/pay/${commerce.commerce_id}` : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(commerceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "URL copied" })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Your permanent checkout page. Customers enter the amount and pay.</p>

      <Card className="p-5">
        <p className="text-xs text-muted-foreground mb-2">Your Checkout URL</p>
        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all mb-4">{commerceUrl}</div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy URL</>}
          </Button>
          <Button onClick={() => setIsQrModalOpen(true)} variant="outline" className="gap-2">
            <QrCode className="w-4 h-4" /> QR Code
          </Button>
          <Button variant="outline" asChild>
            <a href={commerceUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          </Button>
        </div>
      </Card>

      <Card className="p-5 bg-muted/50">
        <p className="text-sm font-medium text-foreground mb-2">How it works</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>Customer opens the link and enters the amount in <strong>{commerce?.currency || "your currency"}</strong></li>
          <li>An invoice is created and they choose how to pay</li>
          <li>Print the QR code for in-person payments</li>
        </ul>
      </Card>

      <QrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} url={commerceUrl} />
    </div>
  )
}

// ─── Developers Tab ───
function DevelopersTab() {
  const { commerce } = useCommerce()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const apiBase = API_CONFIG.BASE_URL
  const cid = commerce?.commerce_id || "YOUR_COMMERCE_ID"

  const createCode = `curl -X POST ${apiBase}/invoices \\
  -H "Content-Type: application/json" \\
  -d '{"commerce_id":"${cid}","amount_fiat":50}'`

  const responseCode = `{
  "success": true,
  "data": {
    "id": "invoice-uuid",
    "amount_fiat": 50,
    "fiat_currency": "${commerce?.currency || "USD"}",
    "status": "Pending",
    "expires_at": "2026-03-30T06:00:00Z"
  }
}`

  function CB({ code, id, label }: { code: string; id: string; label?: string }) {
    return (
      <div>
        {label && <p className="text-sm font-medium mb-2">{label}</p>}
        <div className="relative">
          <pre className="p-3 bg-muted rounded-lg text-sm overflow-x-auto font-mono">{code}</pre>
          <Button variant="ghost" size="sm" className="absolute top-1 right-1" onClick={() => copy(code, id)}>
            {copied === id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Accept payments programmatically from your app or website</p>

      {/* Commerce ID */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Your Commerce ID</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">{cid}</code>
          <Button variant="outline" size="sm" onClick={() => copy(cid, "id")}>
            {copied === "id" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Steps */}
      <Card className="p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold mb-1">1. Create an Invoice</p>
          <p className="text-xs text-muted-foreground mb-2">POST with amount in {commerce?.currency || "your currency"}. Returns an invoice ID.</p>
          <CB code={createCode} id="create" />
          <p className="text-xs text-muted-foreground mt-2 mb-1">Response:</p>
          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono text-green-500">{responseCode}</pre>
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">2. Redirect to Checkout</p>
          <p className="text-xs text-muted-foreground mb-2">Customer chooses to pay via wallet or deposit address.</p>
          <CB code={`${CHECKOUT_BASE_URL}/checkout/{invoice_id}`} id="url" />
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">3. Check Payment Status</p>
          <p className="text-xs text-muted-foreground mb-2">
            Poll until status is <code className="bg-muted px-1 rounded text-xs">Paid</code> or <code className="bg-muted px-1 rounded text-xs">Expired</code>
          </p>
          <CB code={`curl ${apiBase}/invoices/{invoice_id}`} id="get" />
        </div>
      </Card>

      {/* Other */}
      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold">Other Endpoints</p>
        <CB code={`curl ${apiBase}/invoices/by-commerce/${cid}`} id="list" label="List all invoices" />
        <CB code={`curl ${apiBase}/commerces/${cid}/balances`} id="bal" label="Get balances (all networks)" />
      </Card>
    </div>
  )
}

// ─── Main Page ───
export default function ReceivePage() {
  const { authenticated } = usePrivy()

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to manage payments</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Receive Payments</h1>
      </div>

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="links" className="gap-2"><LinkIcon className="w-4 h-4" /> Invoices</TabsTrigger>
          <TabsTrigger value="commerce" className="gap-2"><QrCode className="w-4 h-4" /> Commerce Link</TabsTrigger>
          <TabsTrigger value="developers" className="gap-2"><Code className="w-4 h-4" /> Developers</TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4"><PaymentLinksTab /></TabsContent>
        <TabsContent value="commerce" className="mt-4"><CommerceLinkTab /></TabsContent>
        <TabsContent value="developers" className="mt-4"><DevelopersTab /></TabsContent>
      </Tabs>
    </div>
  )
}
