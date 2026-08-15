"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { VoultiMark } from "@/components/voulti-logo"

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "COP", label: "COP — Colombian Peso" },
  { code: "MXN", label: "MXN — Mexican Peso" },
  { code: "ARS", label: "ARS — Argentine Peso" },
  { code: "BRL", label: "BRL — Brazilian Real" },
  { code: "EUR", label: "EUR — Euro" },
]

interface Props {
  onSubmit: (data: { name: string; currency: string; email?: string }) => Promise<void>
}

export function OnboardingSheet({ onSubmit }: Props) {
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        currency,
        email: email.trim() || undefined,
      })
    } catch (err: any) {
      setError(err.message || "Failed to register")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8">
      <div className="flex flex-col items-center gap-3 mb-8">
        <VoultiMark className="w-16 h-16 text-[#288E5B]" label="Voulti" />
        <h1 className="text-2xl font-bold text-center">Welcome to Voulti Pay</h1>
        <p className="text-sm text-muted-foreground text-center">
          Set up your business to start receiving payments in crypto
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Business name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Store"
            required
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Base currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Amounts on payment links will be in this currency
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-base"
          />
          <p className="text-xs text-muted-foreground mt-1">
            For payment notifications.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="mt-4 py-4 bg-brand-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
          ) : (
            "Create business"
          )}
        </button>
      </form>
    </div>
  )
}
