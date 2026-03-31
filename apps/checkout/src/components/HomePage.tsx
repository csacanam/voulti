import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { QRCodeComponent } from './QRCode';
import { MetaTags } from './MetaTags';

const DEMO_COMMERCE_ID = '43f5294f-3ed7-4850-9376-7de4fef763d7';

export const HomePage: React.FC = () => {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const baseUrl = window.location.origin;
  const commerceUrl = `${baseUrl}/pay/${DEMO_COMMERCE_ID}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <MetaTags
        title={language === 'es' ? 'Voulti — Acepta pagos con crypto' : 'Voulti — Accept crypto payments'}
        description={language === 'es'
          ? 'Pasarela de pagos crypto para comercios. USDC, USDT y stablecoins en 5 redes.'
          : 'Crypto payment gateway for merchants. USDC, USDT and stablecoins on 5 networks.'}
      />
      <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Voulti</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <a
              href="https://app.voulti.com"
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {language === 'es' ? 'Crear Cuenta' : 'Get Started'}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {language === 'es'
              ? 'Tus clientes quieren pagar con crypto. Déjalos.'
              : 'Your customers want to pay with crypto. Let them.'}
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            {language === 'es'
              ? 'Voulti es la pasarela de pagos que permite a cualquier comercio recibir USDC, USDT y stablecoins en 5 redes. Sin intermediarios. Liquidación instantánea. Solo 1% de comisión.'
              : 'Voulti is the payment gateway that lets any business accept USDC, USDT and stablecoins on 5 networks. No middlemen. Instant settlement. Just 1% fee.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://app.voulti.com"
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              {language === 'es' ? 'Crear Cuenta Gratis' : 'Create Free Account'}
            </a>
            <a
              href="#demos"
              className="bg-white border border-gray-200 hover:border-violet-300 text-gray-700 font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              {language === 'es' ? 'Ver Cómo Funciona' : 'See How It Works'}
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-6 tracking-wide">
            Celo · Arbitrum · Polygon · Base · BSC
          </p>
        </div>
      </section>

      {/* 3 Ways to Receive Payments */}
      <section id="demos" className="py-16 px-4 bg-white border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {language === 'es' ? '3 formas de recibir pagos' : '3 ways to receive payments'}
          </h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            {language === 'es'
              ? 'Elige la que mejor se adapte a tu negocio. Todas funcionan con los mismos tokens y redes.'
              : 'Choose what fits your business. All work with the same tokens and networks.'}
          </p>

          <div className="space-y-16">

            {/* 1. QR / Commerce Link */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">1</div>
                  <h3 className="text-xl font-bold">
                    {language === 'es' ? 'QR en tu local' : 'QR at your store'}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {language === 'es'
                    ? 'Imprime un QR y ponlo en tu caja. El cliente lo escanea, ingresa el monto y paga con su wallet o desde un exchange.'
                    : 'Print a QR code and place it at your counter. The customer scans it, enters the amount, and pays from their wallet or exchange.'}
                </p>
                <a
                  href={commerceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-700 font-medium text-sm"
                >
                  {language === 'es' ? 'Probar demo en vivo →' : 'Try live demo →'}
                </a>
              </div>
              <div className="flex justify-center">
                <div className="w-[280px] overflow-hidden rounded-[22px] shadow-sm border border-gray-200">
                  {/* Purple header */}
                  <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '22px 16px' }} className="text-center">
                    <p className="text-white font-black text-[22px] leading-tight" style={{ letterSpacing: '-0.5px' }}>
                      {language === 'es' ? 'Aceptamos' : 'Crypto'}<br/>
                      {language === 'es' ? 'Cripto Aquí' : 'Accepted Here'}
                    </p>
                    <p className="text-white/60 text-[10px] font-semibold mt-1.5 uppercase" style={{ letterSpacing: '2px' }}>
                      {language === 'es' ? 'Escanea para pagar' : 'Scan to pay'}
                    </p>
                  </div>
                  {/* QR */}
                  <div className="bg-white px-5 pt-5 pb-4 text-center">
                    <div className="inline-block p-3 bg-gray-50 rounded-[16px] border-2 border-gray-100">
                      <QRCodeComponent value={commerceUrl} size={150} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">
                      <span className="font-semibold text-gray-500">{language === 'es' ? 'Escanea' : 'Scan'}</span> {language === 'es' ? 'con tu cámara para pagar con' : 'with your camera to pay with'}
                      <br/>{language === 'es' ? 'USDC, USDT y más' : 'USDC, USDT & more'}
                    </p>
                    <p className="text-[13px] text-gray-700 font-bold mt-2">Peewah</p>
                  </div>
                  {/* Footer */}
                  <div className="bg-gray-50 border-t border-gray-100 py-2.5 text-center">
                    <p className="text-[10px] text-gray-400" style={{ letterSpacing: '0.3px' }}>Powered by <span className="font-extrabold text-gray-900">Voulti</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Payment Link */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center">2</div>
                  <h3 className="text-xl font-bold">
                    {language === 'es' ? 'Links de pago' : 'Payment links'}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {language === 'es'
                    ? 'Desde tu dashboard, crea un link con el monto exacto. Compártelo por WhatsApp, email o redes sociales. El cliente paga sin instalar nada.'
                    : 'From your dashboard, create a link with the exact amount. Share it via WhatsApp, email, or social media. The customer pays without installing anything.'}
                </p>
                <a
                  href="https://app.voulti.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-700 font-medium text-sm"
                >
                  {language === 'es' ? 'Crear link de pago →' : 'Create a payment link →'}
                </a>
              </div>
              <div className="md:order-1 flex justify-center">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 max-w-[320px] w-full">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">
                    {language === 'es' ? 'Ejemplo de link' : 'Example link'}
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-600 font-mono break-all">{commerceUrl}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(commerceUrl)}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    {copied ? (language === 'es' ? '¡Copiado!' : 'Copied!') : (language === 'es' ? 'Copiar link' : 'Copy link')}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. API */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center">3</div>
                  <h3 className="text-xl font-bold">
                    {language === 'es' ? 'Integración por API' : 'API integration'}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {language === 'es'
                    ? 'Integra pagos crypto directo en tu sitio web, app o sistema. Crea invoices por API y redirige al checkout. Recibe webhooks cuando el pago se confirma.'
                    : 'Integrate crypto payments directly into your website, app, or system. Create invoices via API and redirect to checkout. Receive webhooks when payment is confirmed.'}
                </p>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-600 hover:text-violet-700 font-medium text-sm"
                >
                  {language === 'es' ? 'Ver documentación API →' : 'View API docs →'}
                </a>
              </div>
              <div className="flex justify-center">
                <div className="bg-gray-900 rounded-2xl p-5 max-w-[340px] w-full overflow-hidden">
                  <pre className="text-green-400 text-xs leading-relaxed overflow-x-auto">
{`POST /invoices
{
  "commerce_id": "${DEMO_COMMERCE_ID.slice(0, 8)}...",
  "amount_fiat": 25000
}

→ 201 Created
{
  "id": "9c99f194-18ea-..."
}

→ ${baseUrl}/checkout/{id}`}
                  </pre>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Why Voulti */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            {language === 'es' ? 'Por qué Voulti' : 'Why Voulti'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">⚡</span>
              </div>
              <h3 className="font-semibold mb-2">
                {language === 'es' ? 'Liquidación instantánea' : 'Instant settlement'}
              </h3>
              <p className="text-sm text-gray-500">
                {language === 'es'
                  ? 'Los fondos llegan a tu wallet en el momento que tu cliente paga.'
                  : 'Funds arrive in your wallet the moment your customer pays.'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">💰</span>
              </div>
              <h3 className="font-semibold mb-2">
                {language === 'es' ? '1% de comisión fija' : '1% flat fee'}
              </h3>
              <p className="text-sm text-gray-500">
                {language === 'es'
                  ? 'Sin costos de setup, sin mensualidades, sin cargos ocultos.'
                  : 'No setup costs, no monthly fees, no hidden charges.'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl">🔐</span>
              </div>
              <h3 className="font-semibold mb-2">
                {language === 'es' ? 'Auto-custodia' : 'Self-custody'}
              </h3>
              <p className="text-sm text-gray-500">
                {language === 'es'
                  ? 'Tus fondos, tu wallet. Retira cuando quieras, sin permisos.'
                  : 'Your funds, your wallet. Withdraw anytime, no permissions needed.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-violet-50 to-violet-100 rounded-2xl border border-violet-200 p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {language === 'es' ? 'Empieza a recibir pagos hoy' : 'Start accepting payments today'}
            </h2>
            <p className="text-gray-600 mb-6">
              {language === 'es'
                ? 'Crea tu cuenta en minutos. Sin documentos, sin aprobaciones.'
                : 'Create your account in minutes. No paperwork, no approvals.'}
            </p>
            <a
              href="https://app.voulti.com"
              className="inline-flex bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              {language === 'es' ? 'Crear Cuenta Gratis' : 'Create Free Account'}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-gray-400 text-xs">
            &copy; Voulti {new Date().getFullYear()} &middot; A{' '}
            <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 hover:text-violet-700 transition-colors">Saka Labs</a>{' '}
            product
          </p>
        </div>
      </footer>
      </div>
    </>
  );
};
