"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Building2 } from "lucide-react"
import { useCommerce } from "@/components/providers/commerce-provider"

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "COP", label: "COP - Colombian Peso" },
  { value: "BRL", label: "BRL - Brazilian Real" },
  { value: "MXN", label: "MXN - Mexican Peso" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "ARS", label: "ARS - Argentine Peso" },
]

export function CommerceRegistrationModal() {
  const { needsRegistration, registerCommerce, loading, error } = useCommerce()
  const [name, setName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!name.trim()) {
      setValidationError("Business name is required")
      return
    }

    try {
      await registerCommerce({ name: name.trim(), currency })
    } catch {
      // Error is handled by context
    }
  }

  return (
    <Dialog open={needsRegistration} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Create Your Account</DialogTitle>
          <DialogDescription className="text-center">
            Set up your business to start receiving crypto payments on 5 networks.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {(error || validationError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || validationError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Business Name *</Label>
            <Input
              id="name"
              placeholder="My Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Base Currency *</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used to display fiat equivalents in your dashboard</p>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating Account..." : "Get Started"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
