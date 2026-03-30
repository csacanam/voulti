"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, Copy, Check, Code, Webhook, Key } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { API_CONFIG } from "@/services/config"

const CHECKOUT_BASE_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "http://localhost:5175"

export default function DevelopersPage() {
  const { authenticated } = usePrivy()
  const { commerce } = useCommerce()
  const [copied, setCopied] = useState<string | null>(null)

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to view API documentation</p>
          </div>
        </div>
      </Card>
    )
  }

  const apiBase = API_CONFIG.BASE_URL
  const commerceId = commerce?.commerce_id || "YOUR_COMMERCE_ID"

  const createInvoiceCode = `curl -X POST ${apiBase}/invoices \\
  -H "Content-Type: application/json" \\
  -d '{
    "commerce_id": "${commerceId}",
    "amount_fiat": 50
  }'`

  const createInvoiceResponse = `{
  "success": true,
  "data": {
    "id": "invoice-uuid-here",
    "commerce_id": "${commerceId}",
    "amount_fiat": 50,
    "fiat_currency": "${commerce?.currency || "USD"}",
    "status": "Pending",
    "expires_at": "2026-03-30T06:00:00Z"
  }
}`

  const checkoutUrl = `${CHECKOUT_BASE_URL}/checkout/{invoice_id}`
  const getInvoiceCode = `curl ${apiBase}/invoices/{invoice_id}`
  const listInvoicesCode = `curl ${apiBase}/invoices/by-commerce/${commerceId}`
  const getBalancesCode = `curl ${apiBase}/commerces/${commerceId}/balances`

  function CodeBlock({ code, id, label }: { code: string; id: string; label?: string }) {
    return (
      <div>
        {label && <p className="text-sm font-medium mb-2">{label}</p>}
        <div className="relative">
          <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto font-mono">{code}</pre>
          <Button variant="ghost" size="sm" className="absolute top-2 right-2" onClick={() => copyCode(code, id)}>
            {copied === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">API Integration</h1>
        <p className="text-muted-foreground">Accept payments programmatically from your app or website</p>
      </div>

      {/* Commerce ID */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Your Commerce ID</h2>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">{commerceId}</code>
          <Button variant="outline" size="sm" onClick={() => copyCode(commerceId, "id")} className="gap-1.5">
            {copied === "id" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {/* Step 1: Create Invoice */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Code className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">1. Create an Invoice</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Create an invoice with the amount in {commerce?.currency || "your currency"}. Returns an invoice ID you'll use to redirect the customer.
        </p>
        <CodeBlock code={createInvoiceCode} id="create" />
        <p className="text-xs text-muted-foreground mt-3 mb-2">Response:</p>
        <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono text-green-500">{createInvoiceResponse}</pre>
      </Card>

      {/* Step 2: Redirect */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Webhook className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">2. Redirect to Checkout</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Redirect your customer to the checkout page. They choose to pay via wallet connection or deposit address.
        </p>
        <CodeBlock code={checkoutUrl} id="url" />
      </Card>

      {/* Step 3: Check Status */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Code className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">3. Check Payment Status</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Poll the invoice to know when it's paid. Status flow: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Pending</code> → <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Paid</code> or <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Expired</code>
        </p>
        <CodeBlock code={getInvoiceCode} id="get" />
      </Card>

      {/* Other Endpoints */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Other Endpoints</h2>
        <div className="space-y-4">
          <CodeBlock code={listInvoicesCode} id="list" label="List all your invoices" />
          <CodeBlock code={getBalancesCode} id="balances" label="Get your balances (all networks)" />
        </div>
      </Card>
    </div>
  )
}
