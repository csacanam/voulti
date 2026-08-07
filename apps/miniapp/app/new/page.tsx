"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { ArrowLeft, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useCommerce } from "@/hooks/use-commerce"

export default function NewLinkPage() {
  const router = useRouter()
  const { ready, authenticated } = usePrivy()
  const { state } = useCommerce()
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commerce = state.status === "ready" ? state.commerce : null

  if (!ready || !authenticated || state.status !== "ready") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commerce) return

    const amountNum = Number.parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const invoice = await api.createInvoice({
        commerce_id: commerce.commerce_id,
        amount_fiat: amountNum,
        // Sent explicitly: the API no longer infers a pricing currency from
        // the commerce, since that setting only decides how its dashboard
        // totals are displayed. This is the currency shown next to the input.
        currency: commerce.currency,
      })
      router.push(`/links/${invoice.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create link")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">New payment link</h1>
      </header>

      <form onSubmit={handleCreate} className="flex-1 flex flex-col px-4 py-6 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-4 text-2xl font-bold rounded-xl border border-border bg-background"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {commerce?.currency}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The customer will pay the equivalent in USDC or USDT on any supported network.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !amount}
          className="mt-auto py-4 bg-violet-600 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : "Create link"}
        </button>
      </form>
    </div>
  )
}
