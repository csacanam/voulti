"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatePaymentLinkDialog } from "@/components/create-payment-link-dialog"
import { Copy, Ban, Link as LinkIcon, Lock } from "lucide-react"
import type { PaymentLink } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function PaymentLinksPage() {
  const { authenticated } = usePrivy()
  const { toast } = useToast()
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const handleCreateLink = (link: PaymentLink) => {
    setLinks([link, ...links])
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copied",
      description: "Payment link URL copied to clipboard",
    })
  }

  const handleDisableLink = (id: string) => {
    setLinks(links.map((link) => (link.id === id ? { ...link, status: "disabled" as const } : link)))
    toast({
      title: "Link disabled",
      description: "The payment link has been disabled",
    })
  }

  const filteredLinks = links.filter((link) => statusFilter === "all" || link.status === statusFilter)

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Lock className="w-12 h-12" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-sm">Please login to create payment links</p>
          </div>
        </div>
      </Card>
    )
  }

  const statusConfig = {
    active: { label: "Active", variant: "default" as const },
    expired: { label: "Expired", variant: "secondary" as const },
    disabled: { label: "Disabled", variant: "destructive" as const },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Payment Links</h1>
          <p className="text-muted-foreground">Create and manage payment links</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
          <LinkIcon className="w-4 h-4" />
          New Payment Link
        </Button>
      </div>

      {links.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <LinkIcon className="w-12 h-12" />
            <div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No links yet</h3>
              <p className="text-sm mb-4">Create your first payment link.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)} variant="outline">
                Create Payment Link
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Title/ID</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Currency</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Created</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Expires</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Uses</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLinks.map((link) => {
                    const statusInfo = statusConfig[link.status]
                    return (
                      <tr key={link.id} className="hover:bg-muted/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">{link.title}</div>
                          <div className="text-xs text-muted-foreground">{link.id}</div>
                        </td>
                        <td className="p-4 text-foreground">{link.currency}</td>
                        <td className="p-4 text-foreground">
                          {link.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {new Date(link.created).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {link.expires
                            ? new Date(link.expires).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="p-4 text-foreground">{link.uses}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleCopyUrl(link.url)}>
                              <Copy className="w-4 h-4" />
                            </Button>
                            {link.status === "active" && (
                              <Button variant="ghost" size="sm" onClick={() => handleDisableLink(link.id)}>
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <CreatePaymentLinkDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateLink={handleCreateLink}
      />
    </div>
  )
}




