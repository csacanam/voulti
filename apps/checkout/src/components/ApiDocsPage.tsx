import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

const API_BASE = 'https://api.voulti.com';

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  auth: 'Public' | 'API Key' | 'Privy';
  description: string;
  body?: string;
  response?: string;
}

function Endpoint({ method, path, auth, description, body, response }: EndpointProps) {
  const [expanded, setExpanded] = useState(false);
  const methodColors = {
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[method]}`}>{method}</span>
        <code className="text-sm font-mono text-gray-900 flex-1">{path}</code>
        <span className={`text-xs px-2 py-0.5 rounded-full ${auth === 'Public' ? 'bg-green-50 text-green-600' : 'bg-violet-50 text-violet-600'}`}>{auth}</span>
        <span className="text-gray-400 text-sm">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          <p className="text-sm text-gray-600">{description}</p>
          {body && (
            <div>
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Request body</p>
              <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto">{body}</pre>
            </div>
          )}
          {response && (
            <div>
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide font-medium">Response</p>
              <pre className="bg-gray-900 text-blue-400 text-xs p-3 rounded-lg overflow-x-auto">{response}</pre>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">
              <span className="font-medium">Full URL:</span> <code className="text-gray-600">{API_BASE}{path}</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const ApiDocsPage: React.FC = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Voulti</span>
            <span className="text-sm text-gray-400 ml-1">API Docs</span>
          </Link>
          <LanguageSelector />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">API Reference</h1>
        <p className="text-gray-500 mb-8">
          Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{API_BASE}</code>
        </p>

        {/* Quick Start */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold mb-3">Quick Start</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>1.</strong> Create an invoice with <code className="bg-gray-100 px-1 rounded">POST /invoices</code></p>
            <p><strong>2.</strong> Redirect your customer to <code className="bg-gray-100 px-1 rounded">https://voulti.com/checkout/{'{'}<span className="text-violet-600">invoice_id</span>{'}'}</code></p>
            <p><strong>3.</strong> Poll <code className="bg-gray-100 px-1 rounded">GET /invoices/{'{'}<span className="text-violet-600">id</span>{'}'}</code> until status is <code className="bg-green-50 text-green-600 px-1 rounded">Paid</code></p>
          </div>
        </div>

        {/* Invoices */}
        <h2 className="text-xl font-bold mb-4 mt-8">Invoices</h2>
        <div className="space-y-2">
          <Endpoint
            method="POST"
            path="/invoices"
            auth="Public"
            description="Create a new invoice. The amount is in the commerce's base fiat currency. Returns an invoice ID to redirect the customer to checkout."
            body={`{
  "commerce_id": "your-commerce-uuid",
  "amount_fiat": 25000
}`}
            response={`{
  "success": true,
  "data": {
    "id": "inv-uuid-here",
    "commerce_id": "your-commerce-uuid",
    "amount_fiat": 25000,
    "fiat_currency": "COP",
    "status": "Pending",
    "expires_at": "2026-03-31T06:00:00Z",
    "created_at": "2026-03-31T05:00:00Z"
  }
}`}
          />
          <Endpoint
            method="GET"
            path="/invoices/{id}"
            auth="Public"
            description="Get invoice details including status, tokens available for payment, and payment data if paid."
            response={`{
  "id": "inv-uuid-here",
  "status": "Paid",
  "amount_fiat": 25000,
  "fiat_currency": "COP",
  "paid_token": "USDC",
  "paid_network": "Celo",
  "paid_tx_hash": "0x...",
  "paid_amount": 6.12,
  "tokens": [
    { "symbol": "USDC", "network": "Celo", "amount_to_pay": "6.120000", "decimals": 6 },
    { "symbol": "USDT", "network": "Arbitrum", "amount_to_pay": "6.120000", "decimals": 6 }
  ]
}`}
          />
        </div>

        {/* Commerces */}
        <h2 className="text-xl font-bold mb-4 mt-8">Commerces</h2>
        <div className="space-y-2">
          <Endpoint
            method="GET"
            path="/commerces/{id}"
            auth="Public"
            description="Get commerce details: name, currency, supported tokens, min/max amounts."
          />
          <Endpoint
            method="GET"
            path="/commerces/{id}/balances"
            auth="Privy"
            description="Get commerce balances across all 5 networks. Requires authentication."
          />
        </div>

        {/* Blockchain */}
        <h2 className="text-xl font-bold mb-4 mt-8">Blockchain</h2>
        <div className="space-y-2">
          <Endpoint
            method="POST"
            path="/blockchain/create"
            auth="Public"
            description="Create the invoice on-chain. Called by the checkout frontend after the customer selects a network."
            body={`{
  "invoiceId": "inv-uuid-here",
  "chainId": 42220,
  "paymentOptions": [
    { "token": "0xcebA...", "amount": "6.12", "decimals": 6 }
  ]
}`}
          />
          <Endpoint
            method="GET"
            path="/blockchain/status/{invoiceId}?chainId=42220"
            auth="Public"
            description="Check on-chain invoice status. Returns payment options with exact amounts from the smart contract."
          />
        </div>

        {/* Deposit (Pay by Address) */}
        <h2 className="text-xl font-bold mb-4 mt-8">Pay by Address</h2>
        <div className="space-y-2">
          <Endpoint
            method="POST"
            path="/deposit/generate"
            auth="Public"
            description="Generate a unique deposit address for an invoice. The customer sends tokens to this address and the system auto-sweeps."
            body={`{
  "invoiceId": "inv-uuid-here",
  "chainId": 42220,
  "tokenAddress": "0xcebA...",
  "tokenSymbol": "USDC",
  "tokenDecimals": 6,
  "expectedAmount": "6.120000"
}`}
            response={`{
  "success": true,
  "data": {
    "address": "0x9858EfFD...",
    "network": "celo",
    "chainId": 42220,
    "tokenSymbol": "USDC",
    "expectedAmount": "6.120000",
    "status": "awaiting"
  }
}`}
          />
          <Endpoint
            method="GET"
            path="/deposit/status/{invoiceId}"
            auth="Public"
            description="Poll deposit status. Returns: awaiting → partial → detected → sweeping → swept (payment complete)."
          />
        </div>

        {/* Prices */}
        <h2 className="text-xl font-bold mb-4 mt-8">Prices & Stats</h2>
        <div className="space-y-2">
          <Endpoint
            method="GET"
            path="/prices/rates"
            auth="Public"
            description="Get current fiat exchange rates and token prices from the database."
            response={`{
  "fiat": { "COP": 4200, "EUR": 0.87, "BRL": 5.26, "MXN": 18.1, "ARS": 1398 },
  "tokens": { "USDC": 0.9997, "USDT": 0.9991, "COPm": 0.000272 }
}`}
          />
          <Endpoint
            method="GET"
            path="/stats"
            auth="Public"
            description="Revenue stats. Shows total service fee balances across all networks (building in public)."
          />
        </div>

        {/* Networks */}
        <h2 className="text-xl font-bold mb-4 mt-8">Supported Networks</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-medium text-gray-500">Network</th>
                <th className="text-left p-3 font-medium text-gray-500">Chain ID</th>
                <th className="text-left p-3 font-medium text-gray-500">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="p-3">Celo</td><td className="p-3 font-mono">42220</td><td className="p-3">USDC, USDT, COPm</td></tr>
              <tr><td className="p-3">Arbitrum</td><td className="p-3 font-mono">42161</td><td className="p-3">USDC, USDT</td></tr>
              <tr><td className="p-3">Polygon</td><td className="p-3 font-mono">137</td><td className="p-3">USDC, USDT</td></tr>
              <tr><td className="p-3">Base</td><td className="p-3 font-mono">8453</td><td className="p-3">USDC</td></tr>
              <tr><td className="p-3">BSC</td><td className="p-3 font-mono">56</td><td className="p-3">USDC, USDT</td></tr>
            </tbody>
          </table>
        </div>

        {/* Invoice Statuses */}
        <h2 className="text-xl font-bold mb-4 mt-8">Invoice Statuses</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">Pending</span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Paid</span>
            <span className="text-gray-400">or</span>
            <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium">Expired</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">Invoices expire after 1 hour by default. Pass <code className="bg-gray-100 px-1 rounded">expires_at</code> to set a custom expiration.</p>
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
