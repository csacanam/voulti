import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://pay.voulti.com'),
  title: 'Voulti Pay — Get paid in crypto',
  description: 'Create payment links and get paid in USDC or USDT from any wallet.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Voulti Pay',
    description: 'Create payment links and get paid in USDC or USDT.',
    url: 'https://pay.voulti.com',
    siteName: 'Voulti Pay',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voulti Pay',
    description: 'Create payment links and get paid in USDC or USDT.',
  },
  other: {
    // MiniPay detection hints
    'minipay:version': '1',
    // Talent Protocol domain verification
    'talentapp:project_verification': 'a99e86d66d940fc1229d03f403f8ff080f62d3ae1d6ac786064671b2b0dc950b81971841dd3f00e14cb70a12d7af6cc026d1319c8ddbc244a1f3b4a6c2c5e2f9',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-muted antialiased">
        <Providers>
          {/* Constrain to mobile width — mini apps run in ~375px viewports */}
          <div className="mx-auto max-w-md min-h-screen bg-background shadow-sm">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
