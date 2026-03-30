"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}

export function QrModal({ open, onOpenChange, url }: QrModalProps) {
  const { toast } = useToast()

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copied",
      description: "Commerce URL copied to clipboard",
    })
  }

  const handleDownloadQR = () => {
    toast({
      title: "Download QR",
      description: "QR code download functionality coming soon",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Commerce Link QR Code</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Placeholder QR - En producción usarías una librería como qrcode.react */}
          <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center border-2 border-border">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">QR Code</p>
              <p className="text-xs mt-2">Will be generated for:</p>
              <p className="text-xs font-mono mt-1 break-all px-4">{url}</p>
            </div>
          </div>

          <div className="w-full">
            <p className="text-sm text-muted-foreground text-center break-all">{url}</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDownloadQR} className="gap-2">
            <Download className="w-4 h-4" />
            Download PNG
          </Button>
          <Button onClick={handleCopyUrl} className="gap-2">
            <Copy className="w-4 h-4" />
            Copy URL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




