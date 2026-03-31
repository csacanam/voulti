import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

const API_BASE = 'https://api.voulti.com';
const CHECKOUT_BASE = 'https://voulti.com';

export const ApiDocsPage: React.FC = () => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isEs = language === 'es';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Voulti</span>
            <span className="text-sm text-gray-400 ml-1">API</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">
          {isEs ? 'Integra pagos crypto en 3 pasos' : 'Integrate crypto payments in 3 steps'}
        </h1>
        <p className="text-gray-500 mb-10">
          Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{API_BASE}</code>
        </p>

        {/* Step 1: Create Invoice */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">1</div>
            <h2 className="text-xl font-bold">
              {isEs ? 'Crea un invoice' : 'Create an invoice'}
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            {isEs
              ? 'Envía el monto en la moneda base de tu comercio. El API retorna un ID que usarás para redirigir al cliente.'
              : 'Send the amount in your commerce\'s base currency. The API returns an ID you\'ll use to redirect the customer.'}
          </p>

          <div className="bg-gray-900 rounded-xl p-5 relative">
            <button
              onClick={() => copy(`curl -X POST ${API_BASE}/invoices \\
  -H "Content-Type: application/json" \\
  -d '{"commerce_id": "YOUR_COMMERCE_ID", "amount_fiat": 25000}'`, 'req')}
              className="absolute top-3 right-3 text-xs text-gray-500 hover:text-white transition-colors"
            >
              {copied === 'req' ? '✓' : 'Copy'}
            </button>
            <pre className="text-green-400 text-sm overflow-x-auto">
{`curl -X POST ${API_BASE}/invoices \\
  -H "Content-Type: application/json" \\
  -d '{
    "commerce_id": "YOUR_COMMERCE_ID",
    "amount_fiat": 25000
  }'`}
            </pre>
          </div>

          <p className="text-xs text-gray-400 mt-3 mb-2">{isEs ? 'Respuesta:' : 'Response:'}</p>
          <div className="bg-gray-900 rounded-xl p-5">
            <pre className="text-blue-400 text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "id": "9c99f194-18ea-406b-b5e4-81435271d181",
    "amount_fiat": 25000,
    "fiat_currency": "COP",
    "status": "Pending",
    "expires_at": "2026-03-31T06:00:00Z"
  }
}`}
            </pre>
          </div>

          <div className="mt-4 bg-violet-50 border border-violet-200 rounded-lg p-4">
            <p className="text-sm text-violet-700">
              <strong>{isEs ? 'Tu Commerce ID' : 'Your Commerce ID'}:</strong>{' '}
              {isEs
                ? 'Lo encuentras en tu dashboard → Account → Commerce ID'
                : 'Find it in your dashboard → Account → Commerce ID'}
              {' → '}
              <a href="https://app.voulti.com/account" target="_blank" rel="noopener noreferrer" className="underline">
                app.voulti.com/account
              </a>
            </p>
          </div>
        </div>

        {/* Step 2: Redirect */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">2</div>
            <h2 className="text-xl font-bold">
              {isEs ? 'Redirige al cliente al checkout' : 'Redirect the customer to checkout'}
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            {isEs
              ? 'Usa el ID del invoice para construir la URL del checkout. El cliente elige cómo pagar: conectar wallet o enviar a una dirección.'
              : 'Use the invoice ID to build the checkout URL. The customer chooses how to pay: connect wallet or send to an address.'}
          </p>

          <div className="bg-gray-900 rounded-xl p-5 relative">
            <button
              onClick={() => copy(`${CHECKOUT_BASE}/checkout/{invoice_id}`, 'url')}
              className="absolute top-3 right-3 text-xs text-gray-500 hover:text-white transition-colors"
            >
              {copied === 'url' ? '✓' : 'Copy'}
            </button>
            <pre className="text-amber-400 text-sm">
{`${CHECKOUT_BASE}/checkout/9c99f194-18ea-406b-b5e4-81435271d181`}
            </pre>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            {isEs
              ? 'Comparte esta URL con tu cliente por email, WhatsApp, o redirige desde tu sitio web.'
              : 'Share this URL with your customer via email, WhatsApp, or redirect from your website.'}
          </p>
        </div>

        {/* Step 3: Check Status */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center">3</div>
            <h2 className="text-xl font-bold">
              {isEs ? 'Verifica si ya pagó' : 'Check if they paid'}
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            {isEs
              ? 'Consulta el estado del invoice. Cuando el status cambie a "Paid", el pago está confirmado.'
              : 'Poll the invoice status. When it changes to "Paid", the payment is confirmed.'}
          </p>

          <div className="bg-gray-900 rounded-xl p-5 relative">
            <button
              onClick={() => copy(`curl ${API_BASE}/invoices/{invoice_id}`, 'status')}
              className="absolute top-3 right-3 text-xs text-gray-500 hover:text-white transition-colors"
            >
              {copied === 'status' ? '✓' : 'Copy'}
            </button>
            <pre className="text-green-400 text-sm">
{`curl ${API_BASE}/invoices/9c99f194-18ea-406b-b5e4-81435271d181`}
            </pre>
          </div>

          <p className="text-xs text-gray-400 mt-3 mb-2">{isEs ? 'Cuando el pago se confirma:' : 'When payment is confirmed:'}</p>
          <div className="bg-gray-900 rounded-xl p-5">
            <pre className="text-blue-400 text-sm overflow-x-auto">
{`{
  "status": "Paid",
  "paid_token": "USDC",
  "paid_network": "Celo",
  "paid_tx_hash": "0xabc123...",
  "paid_amount": 6.12,
  "paid_at": "2026-03-31T05:23:00Z"
}`}
            </pre>
          </div>
        </div>

        {/* Webhook */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4">
            {isEs ? 'Webhook (opcional)' : 'Webhook (optional)'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isEs
              ? 'Configura una URL y recibirás un POST automático cuando un invoice se pague. Puedes usar webhook en vez de polling, o ambos.'
              : 'Set a URL and you\'ll receive an automatic POST when an invoice is paid. Use webhook instead of polling, or both.'}
          </p>

          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <p className="text-sm text-gray-600 mb-3">
              {isEs ? 'Configúralo en:' : 'Set it up at:'}{' '}
              <a href="https://app.voulti.com/receive" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">
                app.voulti.com → Receive → Developers
              </a>
            </p>
          </div>

          <p className="text-xs text-gray-400 mb-2">{isEs ? 'Payload que recibirás:' : 'Payload you\'ll receive:'}</p>
          <div className="bg-gray-900 rounded-xl p-5">
            <pre className="text-blue-400 text-sm overflow-x-auto">
{`POST https://yourdomain.com/webhook

{
  "invoice_id": "9c99f194-...",
  "amount_fiat": 25000,
  "fiat_currency": "COP",
  "status": "Paid",
  "paid_token": "USDC",
  "paid_network": "Celo",
  "paid_tx_hash": "0xabc123...",
  "paid_amount": 6.12,
  "paid_at": "2026-03-31T05:23:00Z"
}`}
            </pre>
          </div>
        </div>

        {/* Status Flow */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4">{isEs ? 'Estados del invoice' : 'Invoice statuses'}</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-sm font-medium">Pending</span>
              <span className="text-gray-400">→</span>
              <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-medium">Paid</span>
              <span className="text-gray-400">{isEs ? 'o' : 'or'}</span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-full text-sm font-medium">Expired</span>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {isEs
                ? 'Los invoices expiran en 1 hora por defecto. Puedes enviar expires_at para personalizar.'
                : 'Invoices expire in 1 hour by default. Pass expires_at to customize.'}
            </p>
          </div>
        </div>

        {/* Networks */}
        <div className="mb-12">
          <h2 className="text-lg font-bold mb-4">{isEs ? 'Redes soportadas' : 'Supported networks'}</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-500">{isEs ? 'Red' : 'Network'}</th>
                  <th className="text-left p-3 font-medium text-gray-500">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="p-3">Celo</td><td className="p-3">USDC, USDT, COPm</td></tr>
                <tr><td className="p-3">Arbitrum</td><td className="p-3">USDC, USDT</td></tr>
                <tr><td className="p-3">Polygon</td><td className="p-3">USDC, USDT</td></tr>
                <tr><td className="p-3">Base</td><td className="p-3">USDC</td></tr>
                <tr><td className="p-3">BSC</td><td className="p-3">USDC, USDT</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">
            {isEs ? '¿Listo para integrar?' : 'Ready to integrate?'}
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            {isEs
              ? 'Crea tu cuenta y obtén tu Commerce ID para empezar.'
              : 'Create your account and get your Commerce ID to start.'}
          </p>
          <a
            href="https://app.voulti.com"
            className="inline-flex bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isEs ? 'Crear Cuenta' : 'Create Account'}
          </a>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-gray-400 text-xs">
            &copy; Voulti {new Date().getFullYear()} &middot; A{' '}
            <a href="https://sakalabs.io" target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 hover:text-violet-700">Saka Labs</a>{' '}
            product
          </p>
        </div>
      </div>
    </div>
  );
};
