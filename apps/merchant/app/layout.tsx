import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import {
  translations,
  negotiateLanguage,
  defaultLanguage,
  LANGUAGE_COOKIE,
  type Language,
} from '@/lib/locales'
// import { Analytics } from '@vercel/analytics/next'
import PrivyProviderWrapper from '@/components/providers/privy-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { AuthTokenProvider } from '@/components/providers/auth-token-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  // Without a base, the relative image paths below resolve against localhost
  // in the built HTML and every social card renders blank.
  metadataBase: new URL('https://app.voulti.com'),
  title: 'Voulti — Accept Crypto Payments',
  description: 'Crypto payment gateway for merchants. Accept USDC, USDT and stablecoins on 5 networks. Self-custody, instant settlement.',
  keywords: ['crypto payments', 'USDC', 'USDT', 'stablecoin', 'payment gateway', 'merchant', 'Celo', 'Arbitrum', 'Polygon', 'Base', 'BSC'],
  authors: [{ name: 'Saka Labs', url: 'https://sakalabs.io' }],
  // The favicon and the touch icon come from app/icon.svg and app/apple-icon.png,
  // which Next picks up by filename. Declaring them here too would emit them twice.
  openGraph: {
    title: 'Voulti — Accept Crypto Payments',
    description: 'Let your customers pay with USDC, USDT and stablecoins on 5 networks.',
    url: 'https://voulti.com',
    siteName: 'Voulti',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Voulti' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voulti — Accept Crypto Payments',
    description: 'Crypto payment gateway for merchants. 5 networks, instant settlement.',
    images: ['/og.png'],
  },
}

/**
 * Decide the language before rendering anything.
 *
 * Reading a cookie makes every route dynamic, which is the price of not
 * painting English at a Spanish reader for one frame. It is a small price
 * here: these pages prerendered to an empty shell anyway, since the dashboard
 * fetches all of its content from the browser after Privy is ready.
 *
 * A cookie alone would only help people who had already picked, and the
 * person most likely to get the wrong language is the one arriving for the
 * first time — so the header answers when the cookie cannot.
 */
async function resolveLanguage(): Promise<Language> {
  const chosen = (await cookies()).get(LANGUAGE_COOKIE)?.value as Language | undefined
  if (chosen && translations[chosen]) return chosen

  return negotiateLanguage((await headers()).get('accept-language')) ?? defaultLanguage
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const language = await resolveLanguage()

  return (
    <html lang={language}>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} min-h-screen flex flex-col`}>
        <PrivyProviderWrapper>
          <AuthTokenProvider>
            <LanguageProvider initialLanguage={language}>
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
