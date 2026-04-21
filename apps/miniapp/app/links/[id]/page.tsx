"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Copy, Check, Share2, Send, ExternalLink, Loader2, CheckCircle2 } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"

const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "https://voulti.com"
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface Invoice {
  id: string
  amount_fiat: number
  fiat_currency: string
  status: string
  created_at: string
  expires_at?: string
  paid_at?: string
  expired_at?: string
}

function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return "Expired"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "< 1 min"
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ${mins % 60}m`
  const days = Math.floor(hrs / 24)
  return `${days}d ${hrs % 24}h`
}

function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

export default function LinkDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [, setTick] = useState(0)

  // Tick every 30s to refresh countdown
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const checkoutUrl = id ? `${CHECKOUT_URL}/checkout/${id}` : ""

  useEffect(() => {
    if (!id) return

    const fetchInvoice = async () => {
      try {
        const res = await fetch(`${API_BASE}/invoices/${id}`)
        if (!res.ok) return
        const data = await res.json()
        setInvoice(data)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchInvoice()
    // Poll for status updates
    const interval = setInterval(fetchInvoice, 5000)
    return () => clearInterval(interval)
  }, [id])

  const copyLink = () => {
    navigator.clipboard.writeText(checkoutUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const messageText = invoice
    ? `Hi! You can pay me ${invoice.fiat_currency} ${invoice.amount_fiat} here`
    : `Pay me here`

  const shareWhatsApp = () => {
    const full = `${messageText}: ${checkoutUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, "_blank")
  }

  const shareTelegram = () => {
    // Telegram adds the URL automatically from the `url` param — keep text URL-free
    const url = `https://t.me/share/url?url=${encodeURIComponent(checkoutUrl)}&text=${encodeURIComponent(messageText)}`
    window.open(url, "_blank")
  }

  const openLink = () => {
    window.open(checkoutUrl, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <p className="text-sm text-muted-foreground">Link not found</p>
        <button onClick={() => router.push("/")} className="px-4 py-2 border border-border rounded-full text-sm">
          Go home
        </button>
      </div>
    )
  }

  const isPaid = invoice.status === "Paid"
  const isExpired = invoice.status === "Expired"

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Payment link</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-4">
        {/* Status / amount card */}
        <div className={`rounded-2xl p-5 text-center ${
          isPaid
            ? "bg-green-50 border border-green-200"
            : isExpired
            ? "bg-gray-50 border border-gray-200"
            : "bg-gradient-to-br from-violet-600 to-purple-700 text-white"
        }`}>
          <p className={`text-xs uppercase tracking-wide ${isPaid ? "text-green-700" : isExpired ? "text-gray-500" : "text-white/70"}`}>
            {isPaid ? "Paid" : isExpired ? "Expired" : "Awaiting payment"}
          </p>
          <p className="text-3xl font-bold mt-1">
            {invoice.amount_fiat.toLocaleString()} <span className="text-base font-normal opacity-70">{invoice.fiat_currency}</span>
          </p>
          <p className={`text-xs mt-2 ${isPaid ? "text-green-700" : isExpired ? "text-gray-500" : "text-white/70"}`}>
            {isPaid && invoice.paid_at && `Paid on ${formatDateTime(invoice.paid_at)}`}
            {isExpired && `Expired on ${formatDateTime(invoice.expired_at || invoice.expires_at || invoice.created_at)}`}
            {!isPaid && !isExpired && invoice.expires_at && `Expires in ${formatTimeRemaining(invoice.expires_at)}`}
          </p>
        </div>

        {isPaid && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">Payment received successfully</p>
          </div>
        )}

        {!isPaid && !isExpired && (
          <>
            {/* QR */}
            <div className="bg-card rounded-2xl p-6 border border-border flex flex-col items-center gap-3">
              <div className="p-3 bg-white rounded-xl">
                <QRCodeCanvas value={checkoutUrl} size={180} level="M" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Scan or share the link to receive payment
              </p>
            </div>

            {/* URL + actions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
                <code className="flex-1 text-xs font-mono truncate">{checkoutUrl}</code>
                <button onClick={copyLink} className="p-2 rounded-lg hover:bg-muted flex-shrink-0">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={shareWhatsApp}
                className="w-full py-3 bg-[#25D366] text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share on WhatsApp
              </button>

              <button
                onClick={shareTelegram}
                className="w-full py-3 bg-[#229ED9] text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Share on Telegram
              </button>

              <button
                onClick={openLink}
                className="w-full py-3 bg-card border border-border rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open link
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
