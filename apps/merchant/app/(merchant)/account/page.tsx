"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Lock, Loader2, Info, Copy, Save, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { API_CONFIG } from "@/services/config"
import { getAuthToken } from "@/services/api"

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
  const { commerce, loading } = useCommerce()
  const { t, language } = useLanguage()
  const { toast } = useToast()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: t.dashboard.copy })
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
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t.account.currency}</label>
              <p className="text-foreground mt-1">{commerce.currency}</p>
            </div>
          </div>

          <Separator />

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">{t.account.editSoon}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
