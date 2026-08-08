"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Copy, Check, Code, Webhook, Key, QrCode, Link as LinkIcon, ExternalLink, Loader2, Save, Bot } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog"
import { QrModal } from "@/components/qr-modal"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"
import type { PaymentLink } from "@/lib/types"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

const EXPLORERS: Record<string, string> = {
  celo: "https://celoscan.io/address/",
  arbitrum: "https://arbiscan.io/address/",
  polygon: "https://polygonscan.com/address/",
  base: "https://basescan.org/address/",
  bsc: "https://bscscan.com/address/",
}

function explorerAddress(network: string | undefined, address: string): string {
  const base = EXPLORERS[(network || "").toLowerCase()] || EXPLORERS.celo
  return base + address
}

function formatTimeRemaining(expires: string, t: any): string {
  const diff = new Date(expires).getTime() - Date.now()
  if (diff <= 0) return t.time.expired
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return t.time.mLeft.replace("{m}", String(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t.time.hLeft.replace("{h}", String(hours))
  const days = Math.floor(hours / 24)
  return t.time.dLeft.replace("{d}", String(days))
}

// ─── Commerce Banner ───
function CommerceBanner({ commerce }: { commerce: any }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const checkoutUrl = `${CHECKOUT_BASE_URL}/pay/${commerce.commerce_id}`

  const handleCopy = () => {
    navigator.clipboard.writeText(checkoutUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: "URL copied" })
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Your Voulti checkout</p>
            <p className="text-sm font-mono truncate">{checkoutUrl}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQr(true)} className="gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              QR
            </Button>
          </div>
        </div>
      </Card>
      <QrModal open={showQr} onOpenChange={setShowQr} url={checkoutUrl} />
    </>
  )
}

// ─── Payment Links Tab ───
function PaymentLinksTab() {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (!commerce?.commerce_id) { setLoadingLinks(false); return }

    const fetchInvoices = async () => {
      try {
        const { getAuthToken } = await import("@/services/api")
        const token = getAuthToken()
        const res = await fetch(`${API_CONFIG.BASE_URL}/invoices/by-commerce/${commerce.commerce_id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        const invoices = data.data || []

        setLinks(invoices.map((inv: any) => {
          // One key per real outcome. `Refunded` used to fall through to the
          // expiry check and show up as "Expired", which tells the merchant
          // nobody paid — when in fact money arrived and was sent back.
          let status: "active" | "paid" | "expired" | "refunded" = "active"
          if (inv.status === "Paid") status = "paid"
          else if (inv.status === "Refunded") status = "refunded"
          else if (inv.status === "Expired" || (inv.expires_at && new Date(inv.expires_at) < new Date())) status = "expired"

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
            reference: inv.reference || undefined,
            payerAddress: inv.payer_address || undefined,
            txHash: inv.paid_tx_hash || undefined,
            network: inv.paid_network || undefined,
          }
        }))
      } catch { /* empty */ } finally { setLoadingLinks(false) }
    }
    fetchInvoices()
  }, [commerce?.commerce_id])

  const handleCreateLink = (link: PaymentLink) => setLinks([link, ...links])

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({ title: t.receive.urlCopied })
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: t.status.pending, className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    expired: { label: t.status.expired, className: "bg-red-500/10 text-red-400 border-red-500/30" },
    paid: { label: t.status.paid, className: "bg-green-500/10 text-green-400 border-green-500/30" },
    // Blue, not red: money did arrive. Colouring it like a failure would tell
    // the merchant the same thing "Expired" wrongly told them before.
    refunded: { label: t.status.refunded, className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create one-time payment links with a fixed amount</p>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm" className="gap-2">
          <LinkIcon className="w-4 h-4" />
          {t.receive.newLink}
        </Button>
      </div>

      {loadingLinks ? (
        <div className="flex justify-center py-8"><Spinner className="w-6 h-6" /></div>
      ) : links.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <LinkIcon className="w-8 h-8" />
            <p className="text-sm">{t.receive.noLinks}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline" size="sm">{t.receive.createLink}</Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop: table */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">{t.receive.amount}</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">{t.receive.status}</th>
                    {/* Named after what dominates the cell — the identifier the
                        merchant chose. "Customer" promised an identity that
                        crypto cannot deliver, and covered two different things.
                        The payer address sits underneath as provenance. */}
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">{t.receive.reference}</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">{t.receive.created}</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">{t.receive.expires}</th>
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
                        <td className="p-3 text-sm">
                          {link.reference ? (
                            <div className="text-foreground truncate max-w-[180px]" title={link.reference}>{link.reference}</div>
                          ) : (
                            <div className="text-muted-foreground">—</div>
                          )}
                          {link.payerAddress && (
                            <a
                              href={explorerAddress(link.network, link.payerAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-mono text-primary hover:underline"
                              title={link.payerAddress}
                            >
                              {link.payerAddress.slice(0, 6)}…{link.payerAddress.slice(-4)}
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(link.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{link.status !== "active" ? "—" : link.expires ? formatTimeRemaining(link.expires, t) : "—"}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(link.url)} className="gap-1.5">
                            <Copy className="w-4 h-4" /> {t.receive.copyUrl}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="grid gap-3 md:hidden">
            {links.map((link) => {
              const statusInfo = statusConfig[link.status]
              return (
                <Card key={link.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{link.currency} {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                      {/* Mobile hides the desktop columns, so the reference has
                          to travel with the amount or it is not visible at all
                          on the screen most merchants actually use. */}
                      {link.reference ? (
                        <div className="text-sm text-foreground truncate">{link.reference}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground font-mono truncate">{link.id.slice(0, 12)}...</div>
                      )}
                      {link.payerAddress && (
                        <a
                          href={explorerAddress(link.network, link.payerAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-primary hover:underline"
                        >
                          {link.payerAddress.slice(0, 6)}…{link.payerAddress.slice(-4)}
                        </a>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <div>{t.receive.created}: {new Date(link.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    <div>{t.receive.expires}: {link.status !== "active" ? "—" : link.expires ? formatTimeRemaining(link.expires, t) : "—"}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCopyUrl(link.url)} className="gap-1.5 w-full">
                    <Copy className="w-4 h-4" /> {t.receive.copyUrl}
                  </Button>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <CreatePaymentLinkDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreateLink={handleCreateLink} />
    </div>
  )
}

// ─── Commerce Link Tab ───
function CommerceLinkTab() {
  const { commerce } = useCommerce()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const commerceUrl = commerce ? `${CHECKOUT_BASE_URL}/pay/${commerce.commerce_id}` : ""

  const handleCopy = () => {
    navigator.clipboard.writeText(commerceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: t.receive.urlCopied })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t.receive.commerceSubtitle}</p>

      <Card className="p-5">
        <p className="text-xs text-muted-foreground mb-2">{t.receive.checkoutUrl}</p>
        <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all mb-4">{commerceUrl}</div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <><Check className="w-4 h-4" /> {t.createLink.copied}</> : <><Copy className="w-4 h-4" /> {t.receive.copyUrlBtn}</>}
          </Button>
          <Button onClick={() => setIsQrModalOpen(true)} variant="outline" className="gap-2">
            <QrCode className="w-4 h-4" /> {t.receive.qrCode}
          </Button>
          <Button variant="outline" asChild>
            <a href={commerceUrl} target="_blank" rel="noopener noreferrer" className="gap-2">
              <ExternalLink className="w-4 h-4" /> {t.receive.preview}
            </a>
          </Button>
        </div>
      </Card>

      <Card className="p-5 bg-muted/50">
        <p className="text-sm font-medium text-foreground mb-2">{t.receive.howItWorks}</p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>{t.receive.howStep1} <strong>{commerce?.currency || "your currency"}</strong></li>
          <li>{t.receive.howStep2}</li>
          <li>{t.receive.howStep3}</li>
        </ul>
      </Card>

      <QrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} url={commerceUrl} />
    </div>
  )
}

// ─── Webhook Input ───
function WebhookInput({ commerceId, currentUrl }: { commerceId: string; currentUrl: string | null }) {
  const [url, setUrl] = useState(currentUrl || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      const { getAuthToken } = await import("@/services/api")
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/webhook`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmation_url: url || null }),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast({ title: 'Webhook URL saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' as const })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Input placeholder="https://yourdomain.com/webhook" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-sm" />
      <Button onClick={handleSave} disabled={saving} variant="outline" size="sm" className="gap-1.5 shrink-0">
        {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
        {saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  )
}

// ─── Webhook Signing Secret ───
function WebhookSecret({ commerceId }: { commerceId: string }) {
  const [secret, setSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { language } = useLanguage()

  const reveal = async () => {
    setLoading(true)
    try {
      const { getAuthToken } = await import("@/services/api")
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/webhook-secret`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSecret(data.webhook_secret)
    } catch {
      toast({ title: language === 'es' ? 'No se pudo cargar el secreto' : 'Failed to load secret', variant: 'destructive' as const })
    } finally {
      setLoading(false)
    }
  }

  const copy = () => {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-sm font-semibold mb-1">{language === 'es' ? 'Secreto de firma' : 'Signing secret'}</p>
      <p className="text-xs text-muted-foreground mb-2">
        {language === 'es'
          ? 'Cada webhook llega firmado con este secreto para que verifiques que viene de Voulti.'
          : 'Every webhook is signed with this secret so you can verify it comes from Voulti.'}
      </p>
      {secret ? (
        <div className="flex gap-2 items-center">
          <code className="bg-muted px-2 py-1 rounded text-xs font-mono break-all flex-1">{secret}</code>
          <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 shrink-0">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? (language === 'es' ? 'Copiado' : 'Copied') : (language === 'es' ? 'Copiar' : 'Copy')}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={reveal} disabled={loading} className="gap-1.5">
          <Key className="w-3 h-3" /> {loading ? '…' : (language === 'es' ? 'Revelar secreto' : 'Reveal secret')}
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        <code className="bg-muted px-1 rounded">X-Voulti-Signature: t=&lt;unix&gt;,v1=&lt;HMAC-SHA256(secret, t + "." + body)&gt;</code>
      </p>
    </div>
  )
}

// ─── Developers Tab ───
function DevelopersTab() {
  const { commerce } = useCommerce()
  const { t, language } = useLanguage()
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
  -d '{"commerce_id":"${cid}","amount_fiat":50,"currency":"USD","reference":"order-123"}'`

  const responseCode = `{
  "success": true,
  "data": {
    "id": "invoice-uuid",
    "amount_fiat": 50,
    "fiat_currency": "USD",
    "status": "Pending",
    "expires_at": "2026-03-30T06:00:00Z",
    "reference": "order-123"
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
      <p className="text-sm text-muted-foreground">{t.receive.devSubtitle}</p>

      {/* Commerce ID */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">{t.receive.commerceId}</p>
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
          <p className="text-sm font-semibold mb-1">{t.receive.step1Title}</p>
          <p className="text-xs text-muted-foreground mb-2">{t.receive.step1Desc}{t.receive.step1DescEnd}</p>
          <CB code={createCode} id="create" />
          <p className="text-xs text-muted-foreground mt-2 mb-1">{t.receive.response}</p>
          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto font-mono text-green-500">{responseCode}</pre>
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">{t.receive.step2Title}</p>
          <p className="text-xs text-muted-foreground mb-2">{t.receive.step2Desc}</p>
          <CB code={`${CHECKOUT_BASE_URL}/checkout/{invoice_id}`} id="url" />
        </div>

        <div>
          <p className="text-sm font-semibold mb-1">{t.receive.step3Title}</p>
          <p className="text-xs text-muted-foreground mb-2">
            {t.receive.step3Desc} <code className="bg-muted px-1 rounded text-xs">Paid</code> {t.receive.step3Or} <code className="bg-muted px-1 rounded text-xs">Expired</code>
          </p>
          <CB code={`curl ${apiBase}/invoices/{invoice_id}`} id="get" />
        </div>
      </Card>

      {/* Webhook */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-2">Webhook URL</p>
        <p className="text-xs text-muted-foreground mb-3">
          {language === 'es'
            ? 'Recibirás un POST automático cuando un invoice se pague.'
            : 'You\'ll receive an automatic POST when an invoice is paid.'}
        </p>
        <WebhookInput commerceId={cid} currentUrl={commerce?.confirmation_url || null} />
        <p className="text-xs text-muted-foreground mt-2">
          Payload: {'{'} invoice_id, amount_fiat, fiat_currency, status, paid_token, paid_network, paid_tx_hash, paid_amount, paid_at, reference {'}'}
        </p>
        <WebhookSecret commerceId={cid} />
      </Card>

      {/* Other */}
      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold">{t.receive.otherEndpoints}</p>
        <CB code={`curl ${apiBase}/invoices/by-commerce/${cid}`} id="list" label={t.receive.listInvoices} />
        <CB code={`curl ${apiBase}/commerces/${cid}/balances`} id="bal" label={t.receive.getBalances} />
      </Card>

      {/* AI Agents */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">{t.receive.aiAgentsTitle}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t.receive.aiAgentsDesc}</p>
        <p className="text-xs text-muted-foreground mb-1">{t.receive.aiAgentsSkillUrl}</p>
        <CB code={`${CHECKOUT_BASE_URL}/skill.md`} id="skill" />
      </Card>
    </div>
  )
}

// ─── Main Page ───
export default function ReceivePage() {
  const { authenticated } = usePrivy()
  const { commerce } = useCommerce()
  const { t } = useLanguage()

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">{t.general.loginRequired}</h3>
            <p className="text-sm">{t.general.loginDesc}</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{t.receive.title}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">{t.receive.subtitle}</p>
      </div>

      <Tabs defaultValue="links" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="links" className="gap-1 sm:gap-2 px-2 sm:px-3"><LinkIcon className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">{t.receive.paymentLinks}</span><span className="sm:hidden text-xs">Links</span></TabsTrigger>
          <TabsTrigger value="commerce" className="gap-1 sm:gap-2 px-2 sm:px-3"><QrCode className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">{t.receive.commerceLink}</span><span className="sm:hidden text-xs">QR</span></TabsTrigger>
          <TabsTrigger value="developers" className="gap-1 sm:gap-2 px-2 sm:px-3"><Code className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">{t.receive.developers}</span><span className="sm:hidden text-xs">API</span></TabsTrigger>
        </TabsList>
        <TabsContent value="links" className="mt-4"><PaymentLinksTab /></TabsContent>
        <TabsContent value="commerce" className="mt-4"><CommerceLinkTab /></TabsContent>
        <TabsContent value="developers" className="mt-4"><DevelopersTab /></TabsContent>
      </Tabs>
    </div>
  )
}
