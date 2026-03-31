"use client"

import { useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Printer, X } from "lucide-react"
import { QRCodeCanvas } from "qrcode.react"
import { useCommerce } from "@/components/providers/commerce-provider"
import { useLanguage } from "@/components/providers/language-provider"

interface QrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}

export function QrModal({ open, onOpenChange, url }: QrModalProps) {
  const { commerce } = useCommerce()
  const { t } = useLanguage()
  const stickerRef = useRef<HTMLDivElement>(null)

  const handleDownload = useCallback(async () => {
    // Get QR as data URL
    const qrCanvas = stickerRef.current?.querySelector("canvas") as HTMLCanvasElement | null
    if (!qrCanvas) return

    const name = commerce?.name || "Pay Here"
    const scale = 3
    const width = 340 * scale
    const headerHeight = 100 * scale
    const qrSection = 280 * scale
    const footerHeight = 40 * scale
    const totalHeight = headerHeight + qrSection + footerHeight

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = totalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Header — purple gradient
    const grad = ctx.createLinearGradient(0, 0, width, headerHeight)
    grad.addColorStop(0, "#7c3aed")
    grad.addColorStop(1, "#6d28d9")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, headerHeight)

    // Header text
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.font = `900 ${26 * scale}px Inter, -apple-system, sans-serif`
    ctx.fillText("Crypto", width / 2, 38 * scale)
    ctx.fillText("Accepted Here", width / 2, 68 * scale)

    ctx.fillStyle = "rgba(255,255,255,0.6)"
    ctx.font = `600 ${10 * scale}px Inter, -apple-system, sans-serif`
    ctx.letterSpacing = `${2 * scale}px`
    ctx.fillText("SCAN TO PAY", width / 2, 88 * scale)

    // QR section — white
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, headerHeight, width, qrSection)

    // QR border box
    const qrSize = 180 * scale
    const qrX = (width - qrSize - 28 * scale) / 2
    const qrY = headerHeight + 24 * scale
    ctx.fillStyle = "#f9fafb"
    ctx.beginPath()
    ctx.roundRect(qrX, qrY, qrSize + 28 * scale, qrSize + 28 * scale, 20 * scale)
    ctx.fill()
    ctx.strokeStyle = "#f0f0f0"
    ctx.lineWidth = 2 * scale
    ctx.stroke()

    // Draw QR — render crisp by disabling smoothing
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrCanvas, qrX + 14 * scale, qrY + 14 * scale, qrSize, qrSize)
    ctx.imageSmoothingEnabled = true

    // Instructions
    const instrY = qrY + qrSize + 50 * scale
    ctx.fillStyle = "#555555"
    ctx.font = `600 ${12 * scale}px Inter, -apple-system, sans-serif`
    ctx.textAlign = "center"
    ctx.fillText("Scan with your phone camera", width / 2, instrY)
    ctx.fillStyle = "#999999"
    ctx.font = `400 ${12 * scale}px Inter, -apple-system, sans-serif`
    ctx.fillText("to pay with USDC, USDT & more", width / 2, instrY + 18 * scale)

    // Commerce name
    if (name) {
      ctx.fillStyle = "#333333"
      ctx.font = `700 ${14 * scale}px Inter, -apple-system, sans-serif`
      ctx.fillText(name, width / 2, instrY + 46 * scale)
    }

    // Footer
    const footerY = headerHeight + qrSection
    ctx.fillStyle = "#fafafa"
    ctx.fillRect(0, footerY, width, footerHeight)
    ctx.strokeStyle = "#eeeeee"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, footerY)
    ctx.lineTo(width, footerY)
    ctx.stroke()

    const footerTextY = footerY + 24 * scale
    ctx.font = `400 ${11 * scale}px Inter, -apple-system, sans-serif`
    ctx.fillStyle = "#bbbbbb"
    const part1 = "Powered by "
    const part1Width = ctx.measureText(part1).width
    ctx.font = `800 ${11 * scale}px Inter, -apple-system, sans-serif`
    const part2 = "Voulti"
    const part2Width = ctx.measureText(part2).width
    const totalWidth = part1Width + part2Width
    const startX = (width - totalWidth) / 2

    ctx.font = `400 ${11 * scale}px Inter, -apple-system, sans-serif`
    ctx.fillStyle = "#bbbbbb"
    ctx.textAlign = "left"
    ctx.fillText(part1, startX, footerTextY)

    ctx.font = `800 ${11 * scale}px Inter, -apple-system, sans-serif`
    ctx.fillStyle = "#111111"
    ctx.fillText(part2, startX + part1Width, footerTextY)

    // Download
    const link = document.createElement("a")
    link.download = `voulti-sticker-${name.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [commerce?.name])

  const handlePrint = useCallback(() => {
    const qrCanvas = stickerRef.current?.querySelector("canvas")
    const qrDataUrl = qrCanvas?.toDataURL("image/png") || ""
    const name = commerce?.name || ""

    const w = window.open("", "_blank")
    if (!w) return

    w.document.write(`<!DOCTYPE html><html><head>
      <title>Voulti QR</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;font-family:'Inter',sans-serif}
        .s{width:360px;background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 4px 30px rgba(0,0,0,0.1)}
        .h{background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 24px;text-align:center}
        .h h1{color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;line-height:1.2}
        .h p{color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;margin-top:8px}
        .m{padding:32px;text-align:center}
        .qr{display:inline-block;padding:16px;background:#f9fafb;border-radius:20px;border:2px solid #f0f0f0}
        .qr img{width:200px;height:200px;display:block}
        .inst{margin-top:20px;font-size:13px;color:#999;line-height:1.6}
        .inst strong{color:#555}
        .nm{margin-top:16px;font-size:15px;font-weight:700;color:#333}
        .f{background:#fafafa;border-top:1px solid #eee;padding:14px;text-align:center}
        .f span{font-size:11px;color:#bbb;letter-spacing:0.3px}
        .f strong{color:#111;font-weight:800}
        @media print{body{background:#fff}.s{box-shadow:none}}
      </style>
    </head><body>
      <div class="s">
        <div class="h">
          <h1>Crypto<br/>Accepted Here</h1>
          <p>SCAN TO PAY</p>
        </div>
        <div class="m">
          <div class="qr"><img src="${qrDataUrl}" alt="QR"/></div>
          <div class="inst"><strong>Scan</strong> with your phone camera to pay with USDC, USDT & more</div>
          ${name ? `<div class="nm">${name}</div>` : ""}
        </div>
        <div class="f"><span>Powered by <strong>Voulti</strong></span></div>
      </div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
    </body></html>`)
    w.document.close()
  }, [commerce?.name])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] p-0 overflow-hidden border-0 rounded-[28px] gap-0">
        {/* Close */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {/* ─── Sticker (this is what gets downloaded) ─── */}
        <div ref={stickerRef} style={{ background: "#ffffff" }}>
          {/* Header — protagonist */}
          <div
            className="text-center"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              padding: "28px 20px",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                fontSize: "26px",
                fontWeight: 900,
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
              }}
            >
              {t.qrSticker.cryptoAccepted}
              <br />
              {t.qrSticker.acceptedHere}
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: "11px",
                fontWeight: 600,
                marginTop: "8px",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}
            >
              {t.qrSticker.scanToPay}
            </p>
          </div>

          {/* QR section */}
          <div style={{ padding: "28px 24px 20px", textAlign: "center", background: "#ffffff" }}>
            <div
              style={{
                display: "inline-block",
                padding: "14px",
                background: "#f9fafb",
                borderRadius: "20px",
                border: "2px solid #f0f0f0",
              }}
            >
              <QRCodeCanvas value={url} size={540} level="M" marginSize={1} style={{ width: 176, height: 176 }} />
            </div>

            <p
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "#999",
                lineHeight: 1.6,
              }}
            >
              <span style={{ fontWeight: 600, color: "#555" }}>{t.qrSticker.scanWithCamera}</span> {t.qrSticker.scanDesc}
              <br />
              {t.qrSticker.payWith}
            </p>

            {commerce?.name && (
              <p
                style={{
                  marginTop: "12px",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#333",
                }}
              >
                {commerce.name}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              background: "#fafafa",
              borderTop: "1px solid #eee",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "11px", color: "#bbb", letterSpacing: "0.3px" }}>
              Powered by <span style={{ fontWeight: 800, color: "#111" }}>Voulti</span>
            </p>
          </div>
        </div>

        {/* Actions (outside sticker capture area) */}
        <div className="px-4 pb-4 pt-3 flex gap-2 bg-background border-t">
          <Button onClick={handleDownload} className="flex-1 gap-2">
            <Download className="w-4 h-4" />
            {t.qrSticker.download}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
            <Printer className="w-4 h-4" />
            {t.qrSticker.print}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
