"use client"

import { useState, useEffect, type ReactNode } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Copy, Check, Code, Webhook, Key, QrCode, Link as LinkIcon, ExternalLink, Loader2, Save, Bot, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog"
import { PaymentDetailDialog } from "@/components/payment-detail-dialog"
import { WebhookTester } from "@/components/webhook-tester"
import { WebhookVerifier } from "@/components/webhook-verifier"
import { CodeBlock } from "@/components/code-block"
import { QrModal } from "@/components/qr-modal"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"
import type { PaymentLink } from "@/lib/types"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

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
  const [detail, setDetail] = useState<PaymentLink | null>(null)

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
            description: inv.description || undefined,
            payerAddress: inv.payer_address || undefined,
            txHash: inv.paid_tx_hash || undefined,
            network: inv.paid_network || undefined,
            paidToken: inv.paid_token || undefined,
            paidAmount: inv.paid_amount ?? undefined,
            // Three states worth telling apart: never configured, delivered,
            // and still owed. A merchant scanning the list needs to see the
            // third without opening every row.
            webhook: !inv.confirmation_url_available
              ? "none"
              : inv.confirmation_url_response
                ? "delivered"
                : "failing",
            webhookAttempts: inv.confirmation_url_retries ?? 0,
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
                      <tr key={link.id} onClick={() => setDetail(link)} className="hover:bg-muted/50 cursor-pointer">
                        <td className="p-3">
                          {/* The truncated invoice id used to live here. Cut to
                              eight characters it could not be searched, copied
                              or matched against anything — it cost a line and
                              answered nothing. The full id is copyable from the
                              actions column instead. */}
                          <div className="font-medium text-foreground">{link.currency} {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.className}`}>{statusInfo.label}</span>
                        </td>
                        <td className="p-3 text-sm">
                          {/* One line. Everything else about this charge lives
                              in the detail view, where it can carry a label. */}
                          {link.reference ? (
                            <div className="text-foreground truncate max-w-[220px]" title={link.reference}>{link.reference}</div>
                          ) : link.description ? (
                            <div className="text-muted-foreground truncate max-w-[220px]" title={link.description}>{link.description}</div>
                          ) : (
                            <div className="text-muted-foreground">—</div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(link.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{link.status !== "active" ? "—" : link.expires ? formatTimeRemaining(link.expires, t) : "—"}</td>
                        <td className="p-3">
                          {/* What you need when a payment has to be traced in
                              another system: the id Voulti knows it by, and the
                              transaction anyone can verify on-chain. Both were
                              stored; neither was reachable from this table. */}
                          {/* "Copy" and "ID" were icons with no object: copy
                              what, the id of what. The detail view names each
                              value and offers the copy next to it. */}
                          <Button variant="ghost" size="sm" onClick={() => setDetail(link)} className="gap-1.5">
                            {t.receive.viewDetail}
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
                      {/* One identifying line, same as the desktop row. The
                          rest is a tap away rather than stacked and truncated. */}
                      {link.reference ? (
                        <div className="text-sm text-foreground truncate">{link.reference}</div>
                      ) : link.description ? (
                        <div className="text-sm text-muted-foreground truncate">{link.description}</div>
                      ) : null}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <div>{t.receive.created}: {new Date(link.created).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    <div>{t.receive.expires}: {link.status !== "active" ? "—" : link.expires ? formatTimeRemaining(link.expires, t) : "—"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopyUrl(link.url)} className="gap-1.5">
                      <Copy className="w-4 h-4" /> {t.receive.copyUrl}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDetail(link)}>
                      {t.receive.viewDetail}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <PaymentDetailDialog
        link={detail}
        open={detail !== null}
        onOpenChange={(o) => !o && setDetail(null)}
        statusLabel={detail ? statusConfig[detail.status].label : ""}
        statusClass={detail ? statusConfig[detail.status].className : ""}
      />

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

  // The link carries the currency it charges in, so the merchant can hand a EUR
  // link to one audience and a COP one to another from the same account. It
  // starts at USD rather than at the account currency: that setting only picks
  // the unit totals are displayed in, and a display preference should not
  // silently price a link.
  const [linkCurrency, setLinkCurrency] = useState("USD")

  const commerceUrl = commerce
    ? `${CHECKOUT_BASE_URL}/pay/${commerce.commerce_id}?currency=${linkCurrency}`
    : ""

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
        {/* Chosen per link rather than taken from the account: one merchant can
            keep a COP link at home and a EUR one for elsewhere, without an
            account-wide setting deciding for both. */}
        <div className="flex items-center gap-2 mb-3">
          <label htmlFor="link-currency-select" className="text-xs text-muted-foreground">
            {t.receive.linkCurrency}
          </label>
          <select
            id="link-currency-select"
            value={linkCurrency}
            onChange={(e) => setLinkCurrency(e.target.value)}
            className="px-2 py-1 bg-background border border-input rounded-md text-sm font-medium"
          >
            {["USD", "EUR", "COP", "ARS", "BRL", "MXN"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

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
          {/* The account currency sets the price in exactly one place — here —
              because a permanent link has no caller to state one. Saying only
              "in COP" left that looking like a leftover rule now that every
              other charge picks its own currency. */}
          <li>
            {t.receive.howStep1} <strong>{linkCurrency}</strong>
            {t.receive.howStep1End}
          </li>
          <li>{t.receive.howStep2}</li>
          <li>{t.receive.howStep3}</li>
        </ul>
      </Card>

      <QrModal open={isQrModalOpen} onOpenChange={setIsQrModalOpen} url={commerceUrl} />
    </div>
  )
}

// ─── Return URL Domains ───
/**
 * The domains this commerce allows a payer to be sent back to.
 *
 * This list is the only thing standing between `return_url` and an open
 * redirect. Creating an invoice needs no credentials and identifies the
 * merchant by a commerce_id that is public — it is in the address bar of every
 * payment link — so anyone can mint an invoice against this commerce. What they
 * cannot do is edit this list, because saving it goes through the wallet.
 *
 * It starts empty, and empty refuses every return_url. That is deliberate: the
 * feature turning itself on for commerces that never asked for it is exactly
 * the outcome worth avoiding.
 */
function ReturnDomainsInput({ commerceId, current }: { commerceId: string; current: string[] }) {
  const { t } = useLanguage()
  const [domains, setDomains] = useState<string[]>(current)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const save = async (next: string[]) => {
    setSaving(true)
    try {
      const { getAuthToken } = await import("@/services/api")
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/return-domains`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domains: next }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || '')

      // The server normalises — a pasted "https://peewah.co/gracias" comes back
      // as "peewah.co" — so the list is taken from the response rather than
      // from what was typed, or the UI would show entries that never match.
      setDomains(body?.data?.domains ?? next)
      setDraft('')
    } catch (err: any) {
      toast({ title: err?.message || t.general.requestFailed, variant: 'destructive' as const })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="yourdomain.com"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { e.preventDefault(); save([...domains, draft.trim()]) } }}
          className="font-mono text-sm"
        />
        <Button
          onClick={() => draft.trim() && save([...domains, draft.trim()])}
          disabled={saving || !draft.trim()}
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
        >
          <Save className="w-3 h-3" />
          {t.returnDomains.add}
        </Button>
      </div>

      {domains.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {domains.map((domain) => (
            <span key={domain} className="inline-flex items-center gap-1.5 text-xs font-mono bg-muted rounded-md px-2 py-1">
              {domain}
              <button
                onClick={() => save(domains.filter((d) => d !== domain))}
                disabled={saving}
                className="text-muted-foreground hover:text-red-500 transition-colors"
                aria-label={`Remove ${domain}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{t.returnDomains.empty}</p>
      )}
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
/**
 * Three sections, one per person who opens this tab.
 *
 * It used to be five cards in the order they were built. It opened with a value
 * (the commerce id) before anything said what it was for; it taught polling as
 * step 3 and webhooks 500px below, so a developer reading top-down implemented
 * the worse of two mechanisms and never reached the better one; configuration,
 * documentation and testing shared one card; and the AI-agent path — the
 * shortest route that exists today — was the last card, under a drawer labelled
 * "Other endpoints".
 *
 * Now: point an agent at it (fastest), integrate by hand (the real flow, in
 * order, webhook-first), or change settings (what you come back for).
 */
function DevelopersTab() {
  const { commerce } = useCommerce()
  const { t, language } = useLanguage()
  const es = language === 'es'

  const apiBase = API_CONFIG.BASE_URL
  const cid = commerce?.commerce_id || "YOUR_COMMERCE_ID"
  const skillUrl = `${CHECKOUT_BASE_URL}/skill.md`

  /**
   * One paste. The agent needs the skill file and the one value it cannot
   * discover — everything else it reads for itself, which is the whole reason
   * this beats reading the section below.
   */
  const agentPrompt = es
    ? `Integra los pagos de Voulti en este proyecto.

Documentación completa: ${skillUrl}
Mi commerce_id: ${cid}

Léela primero y luego implementa el cobro y el webhook.`
    : `Add Voulti payments to this project.

Full documentation: ${skillUrl}
My commerce_id: ${cid}

Read it first, then implement charging and the webhook.`

  const createCode = `curl -X POST ${apiBase}/invoices \\
  -H "Content-Type: application/json" \\
  -d '{
    "commerce_id": "${cid}",
    "amount_fiat": 50,
    "currency": "USD",
    "reference": "order-123",
    "description": "Logo design"
  }'`

  const responseCode = `{
  "success": true,
  "data": {
    "id": "invoice-uuid",
    "amount_fiat": 50,
    "fiat_currency": "USD",
    "status": "Pending",
    "expires_at": "2026-03-30T06:00:00Z",
    "reference": "order-123",
    "description": "Logo design"
  }
}`

  // Timing-safe compare, and a timestamp tolerance so a captured delivery
  // cannot be replayed back at them tomorrow. Both are the kind of thing that
  // never gets added later if it is not in the snippet people paste.
  const verifyCode = `import { createHmac, timingSafeEqual } from "crypto";

function verifyVoulti(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=")));
  if (!parts.t || !parts.v1) return false;

  // Reject a delivery captured and replayed later
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(parts.t + "." + rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// rawBody must be the unparsed string, not JSON.stringify(req.body)
app.post("/webhooks/voulti", (req, res) => {
  if (!verifyVoulti(req.rawBody, req.headers["x-voulti-signature"], process.env.VOULTI_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: "bad signature" });
  }
  const e = req.body;
  if (e.test) return res.json({ received: true });   // dashboard test, ship nothing
  if (e.status === "Paid")     markPaid(e.reference);
  if (e.status === "Refunded") markRefunded(e.reference);
  res.json({ received: true });
});`

  function Step({ n, title, desc, children }: { n: number; title: string; desc: ReactNode; children: ReactNode }) {
    return (
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
          {n}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── 1. The fastest path, first ── */}
      <Card className="p-5 border-primary/30 bg-primary/[0.03]">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">{t.dev.agentTitle}</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t.dev.agentDesc}</p>
        <CodeBlock code={agentPrompt} lang="bash" />
        <p className="text-xs text-muted-foreground mt-2">{t.dev.agentFooter}</p>
      </Card>

      {/* ── 2. By hand, in the order it actually happens ── */}
      <Card className="p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold">{t.dev.manualTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.dev.manualDesc}</p>
        </div>

        <Step n={1} title={t.dev.s1Title} desc={t.dev.s1Desc}>
          <CodeBlock code={createCode} lang="bash" />
          <CodeBlock code={responseCode} lang="json" label={t.dev.response} />
        </Step>

        <Step n={2} title={t.dev.s2Title} desc={t.dev.s2Desc}>
          <CodeBlock code={`${CHECKOUT_BASE_URL}/checkout/{invoice_id}`} lang="bash" />
        </Step>

        {/* Webhooks are step 3, not a separate card below the fold. Polling used
            to hold this slot and taught the wrong mechanism to anyone who read
            in order — it is now the footnote at the end. */}
        <Step
          n={3}
          title={t.dev.s3Title}
          desc={
            <>
              {t.dev.s3Desc}{" "}
              {["Paid", "Expired", "Refunded"].map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">{s}</code>
                </span>
              ))}
              . {t.dev.s3Null}
            </>
          }
        >
          <CodeBlock code={verifyCode} lang="js" />
          <p className="text-xs text-muted-foreground">{t.dev.s3Raw}</p>
        </Step>

        {/* `by-commerce` and `balances` used to sit here as bare curls. Both
            carry requireAuth and answer 401, so anyone who copied them got a
            failure with nothing to explain it — and there is no public way to
            list a commerce's charges at all, which is a fact worth stating
            rather than contradicting with a command that cannot work. */}
        <div className="pt-4 border-t border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">{t.dev.pollNote}</p>
          <CodeBlock code={`curl ${apiBase}/invoices/{invoice_id}`} lang="bash" />
          <p className="text-xs text-muted-foreground">{t.dev.noList}</p>
        </div>

        <div className="pt-4 border-t border-border/50">
          <a
            href={skillUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1.5"
          >
            {t.dev.fullReference}
            <ExternalLink className="w-3 h-3" />
          </a>
          <p className="text-xs text-muted-foreground mt-1">{t.dev.fullReferenceDesc}</p>
        </div>
      </Card>

      {/* ── 3. Settings: the part you come back to ── */}
      <Card className="p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold">{t.dev.settingsTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t.dev.settingsDesc}</p>
        </div>

        <div>
          <p className="text-xs font-medium mb-0.5">{t.dev.commerceIdLabel}</p>
          <p className="text-xs text-muted-foreground mb-1.5">{t.dev.commerceIdHelp}</p>
          <CodeBlock code={cid} lang="bash" />
        </div>

        <div>
          <p className="text-xs font-medium mb-0.5">{t.dev.webhookUrlLabel}</p>
          <p className="text-xs text-muted-foreground mb-1.5">{t.dev.webhookUrlHelp}</p>
          <WebhookInput commerceId={cid} currentUrl={commerce?.confirmation_url || null} />
        </div>

        <div>
          <p className="text-xs font-medium mb-0.5">{t.returnDomains.label}</p>
          <p className="text-xs text-muted-foreground mb-1.5">{t.returnDomains.help}</p>
          <ReturnDomainsInput commerceId={cid} current={commerce?.return_url_domains || []} />
        </div>

        <WebhookSecret commerceId={cid} />

        <div className="pt-5 border-t border-border/50">
          <WebhookTester commerceId={cid} hasUrl={Boolean(commerce?.confirmation_url)} />
        </div>

        {/* After the test button, because it only means something once a valid
            delivery is known to land — and because "does it work" is the
            question people ask first. */}
        <div className="pt-5 border-t border-border/50">
          <WebhookVerifier commerceId={cid} hasUrl={Boolean(commerce?.confirmation_url)} />
        </div>
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
