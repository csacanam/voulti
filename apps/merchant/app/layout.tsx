import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
// import { Analytics } from '@vercel/analytics/next'
import PrivyProviderWrapper from '@/components/providers/privy-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { AuthTokenProvider } from '@/components/providers/auth-token-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'Voulti — Accept Crypto Payments',
  description: 'Crypto payment gateway for merchants. Accept USDC, USDT and stablecoins on 5 networks. Self-custody, instant settlement.',
  keywords: ['crypto payments', 'USDC', 'USDT', 'stablecoin', 'payment gateway', 'merchant', 'Celo', 'Arbitrum', 'Polygon', 'Base', 'BSC'],
  authors: [{ name: 'Saka Labs', url: 'https://sakalabs.io' }],
  openGraph: {
    title: 'Voulti — Accept Crypto Payments',
    description: 'Let your customers pay with USDC, USDT and stablecoins on 5 networks.',
    url: 'https://voulti.com',
    siteName: 'Voulti',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voulti — Accept Crypto Payments',
    description: 'Crypto payment gateway for merchants. 5 networks, instant settlement.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} min-h-screen flex flex-col`}>
        <PrivyProviderWrapper>
          <AuthTokenProvider>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </AuthTokenProvider>
        </PrivyProviderWrapper>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
