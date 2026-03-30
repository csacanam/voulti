"use client"

import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Info } from "lucide-react"
import type { Commerce } from "@/services"

interface CommerceProfileProps {
  commerce: Commerce
}

export function CommerceProfile({ commerce }: CommerceProfileProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Account</h1>
        <p className="text-muted-foreground">Your commerce information and settings</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {/* Business Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Business Information</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Commerce ID</label>
                <p className="text-sm font-mono text-foreground mt-1">{commerce.commerce_id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Business Name</label>
                <p className="text-foreground mt-1">{commerce.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-foreground mt-1">{commerce.confirmation_email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                <p className="text-foreground mt-1">
                  {new Date(commerce.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description (English)</label>
                <p className="text-foreground mt-1">{commerce.description_english}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description (Spanish)</label>
                <p className="text-foreground mt-1">{commerce.description_spanish}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
                <p className="text-sm font-mono text-foreground mt-1 break-all">{commerce.wallet}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Currency Settings Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">Currency Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Currency</label>
                  <p className="text-foreground mt-1">{commerce.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Currency Symbol</label>
                  <p className="text-foreground mt-1">{commerce.currencySymbol}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Min Amount</label>
                  <p className="text-foreground mt-1">
                    {commerce.minAmount ? `${commerce.currencySymbol}${commerce.minAmount.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Max Amount</label>
                  <p className="text-foreground mt-1">
                    {commerce.maxAmount ? `${commerce.currencySymbol}${commerce.maxAmount.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Spread</label>
                <p className="text-foreground mt-1">{commerce.spread ? `${commerce.spread}%` : "0%"}</p>
              </div>

              {commerce.confirmation_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Webhook URL</label>
                  <p className="text-sm font-mono text-foreground mt-1 break-all">{commerce.confirmation_url}</p>
                </div>
              )}
            </div>
          </div>

          {/* Business Logo Section */}
          {commerce.icon_url && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Business Logo</h3>
                <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
                  <img 
                    src={commerce.icon_url} 
                    alt={commerce.name} 
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Info Section */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Edit functionality coming soon.</span>
              {" "}You'll be able to update your business information, add translations, and configure advanced settings.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

