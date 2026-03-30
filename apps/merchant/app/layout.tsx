import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import PrivyProviderWrapper from '@/components/providers/privy-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voulti Payouts',
  description: 'Global payouts in PYUSD, settled instantly in local stablecoins',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <PrivyProviderWrapper>
          {children}
          <Toaster />
        </PrivyProviderWrapper>
        <Analytics />
      </body>
    </html>
  )
}
