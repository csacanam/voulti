"use client"

import { useState, useEffect } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Lock, Loader2, Copy, Save, Check } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"
import { getAuthToken } from "@/services/api"
import { NetworksSection } from "@/components/networks-section"

function WebhookSection({ commerceId, currentUrl }: { commerceId: string; currentUrl: string | null }) {
  const [url, setUrl] = useState(currentUrl || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/webhook`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmation_url: url || null }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      toast({ title: saved ? '' : 'Webhook URL saved' })
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Webhook URL</h3>
      <p className="text-sm text-muted-foreground mb-3">
        We'll POST payment data to this URL when an invoice is paid.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="https://yourdomain.com/webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-sm"
        />
        <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-1.5 shrink-0">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Payload: {'{'} invoice_id, amount_fiat, fiat_currency, status, paid_token, paid_network, paid_tx_hash, paid_amount {'}'}
      </p>
    </div>
  )
}

export default function AccountPage() {
  const { authenticated } = usePrivy()
  const { commerce, loading, patchCommerce } = useCommerce()
  const { t, language } = useLanguage()
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: t.dashboard.copy })
  }

  const [currency, setCurrency] = useState(commerce?.currency || 'USD')
  const [savingCurrency, setSavingCurrency] = useState(false)

  // Seeded once before `commerce` resolves, so re-sync when it arrives.
  useEffect(() => {
    if (commerce?.currency) setCurrency(commerce.currency)
  }, [commerce?.currency])

  const saveCurrency = async (next: string) => {
    if (!commerce || next === currency) return
    const previous = currency
    setCurrency(next)
    setSavingCurrency(true)

    try {
      const token = getAuthToken()
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerce.commerce_id}/currency`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currency: next }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update currency')
      }

      // Take the server's word, not the select's: it decides the symbol, and
      // pushing it into the shared commerce is what stops the dashboard from
      // still totalling in the previous currency.
      const { data } = await res.json()
      patchCommerce({ currency: data.currency, currencySymbol: data.currency_symbol })

      toast({ title: t.account.currencySaved })
    } catch (err: any) {
      // Put the select back rather than leaving it showing a value the server
      // rejected.
      setCurrency(previous)
      toast({ title: err.message, variant: 'destructive' })
    } finally {
      setSavingCurrency(false)
    }
  }

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

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-12 h-12 animate-spin" />
          <p className="text-sm">{t.account.loading}</p>
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
            <h3 className="text-lg font-semibold mb-2">{t.account.noCommerce}</h3>
            <p className="text-sm">{t.account.noCommerceDesc}</p>
          </div>
        </div>
      </Card>
    )
  }

  const dateLocale = language === "es" ? "es-CO" : "en-US"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t.account.title}</h1>
        <p className="text-muted-foreground">{t.account.subtitle}</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Business Info */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t.account.businessInfo}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.account.businessName}</label>
                <p className="text-foreground mt-1">{commerce.name}</p>
              </div>

              {commerce.confirmation_email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-foreground mt-1">{commerce.confirmation_email}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.account.wallet}</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-foreground break-all">{commerce.wallet}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(commerce.wallet)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.account.commerceId}</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm font-mono text-foreground">{commerce.commerce_id}</p>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(commerce.commerce_id)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t.account.createdAt}</label>
                <p className="text-foreground mt-1">
                  {new Date(commerce.created_at).toLocaleDateString(dateLocale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Currency Settings */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">{t.account.currencySettings}</h3>
            <div className="space-y-2">
              <label htmlFor="account-currency" className="text-sm font-medium text-muted-foreground">
                {t.account.currency}
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="account-currency"
                  value={currency}
                  disabled={savingCurrency}
                  onChange={(e) => saveCurrency(e.target.value)}
                  className="px-3 py-2 bg-background border border-input rounded-md text-sm font-medium disabled:opacity-60"
                >
                  {["USD", "EUR", "COP", "ARS", "BRL", "MXN"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {savingCurrency && <Spinner className="w-4 h-4" />}
              </div>
              {/* Says what changes and what does not, because "currency" on a
                  payments account reads like it might re-price past sales. */}
              <p className="text-xs text-muted-foreground">{t.account.currencyNote}</p>
            </div>
          </div>

          <Separator />
        </div>
      </Card>

      <NetworksSection commerceId={commerce.commerce_id} />
    </div>
  )
}
