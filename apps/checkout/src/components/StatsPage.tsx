import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';
import { MetaTags } from './MetaTags';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://api.voulti.com';

const EXPLORERS: Record<string, string> = {
  celo: 'https://celoscan.io/address/',
  arbitrum: 'https://arbiscan.io/address/',
  polygon: 'https://polygonscan.com/address/',
  base: 'https://basescan.org/address/',
  bsc: 'https://bscscan.com/address/',
};

const NETWORK_LABELS: Record<string, string> = {
  celo: 'Celo',
  arbitrum: 'Arbitrum One',
  polygon: 'Polygon',
  base: 'Base',
  bsc: 'BNB Chain',
};

interface Stats {
  payments: { count: number; volumeUsd: string; commerces: number };
  revenue: {
    earnedUsd: string;
    earned: { network: string; symbol: string; amount: string; usd: string }[];
    claimableUsd: string;
    claimable: { network: string; symbol: string; balance: string; usd: string }[];
  };
  timestamp: string;
}

interface Treasury {
  network: string;
  operator: string | null;
  operatorCanWithdraw: boolean;
}

export const StatsPage: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';

  const [stats, setStats] = useState<Stats | null>(null);
  const [treasury, setTreasury] = useState<Treasury[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [s, t] = await Promise.all([
          fetch(`${API_BASE}/stats`).then(r => r.json()),
          fetch(`${API_BASE}/stats/treasury`).then(r => r.json()),
        ]);
        if (cancelled) return;
        // A failed read must not render as zeros on a transparency page.
        if (s.error) { setError(s.error); return; }
        setStats(s);
        setTreasury(t.data || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Could not load stats');
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const fmt = (n: string) => Number(n).toLocaleString(es ? 'es-CO' : 'en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const holders = [...new Set(treasury.filter(t => t.operatorCanWithdraw && t.operator).map(t => t.operator!))];

  return (
    <>
      <MetaTags
        title={es ? 'Voulti — Métricas del protocolo' : 'Voulti — Protocol stats'}
        description={es
          ? 'Volumen procesado, comercios e ingresos de Voulti, verificables on-chain.'
          : 'Volume processed, merchants and revenue for Voulti, verifiable on-chain.'}
      />
      <div className="min-h-screen bg-gray-50 text-gray-900">
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
                {es ? 'Crear Cuenta' : 'Get Started'}
              </a>
            </div>
          </div>
        </header>

        <section className="py-12 md:py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {es ? 'Métricas del protocolo' : 'Protocol stats'}
            </h1>
            <p className="text-gray-600 mb-10 max-w-2xl">
              {es
                ? 'Todo lo de abajo se puede verificar en la cadena. Los saldos de comisiones se leen de los contratos, no de nuestra base de datos.'
                : 'Everything below is verifiable on-chain. Fee balances are read from the contracts, not from our database.'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-8 text-sm">
                {es ? 'No se pudieron cargar las métricas: ' : 'Could not load stats: '}{error}
              </div>
            )}

            {!stats && !error && (
              <div className="text-gray-400 py-12 text-center">{es ? 'Cargando…' : 'Loading…'}</div>
            )}

            {stats && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                  {[
                    { label: es ? 'Volumen procesado' : 'Volume processed', value: `$${fmt(stats.payments.volumeUsd)}` },
                    { label: es ? 'Pagos liquidados' : 'Payments settled', value: stats.payments.count.toLocaleString() },
                    { label: es ? 'Comercios registrados' : 'Merchants registered', value: stats.payments.commerces.toLocaleString() },
                  ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                      <p className="text-sm text-gray-500 mb-2">{c.label}</p>
                      <p className="text-3xl font-bold">{c.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="font-semibold">{es ? 'Ingresos generados' : 'Revenue earned'}</h2>
                      <span className="text-2xl font-bold">${fmt(stats.revenue.earnedUsd)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {es ? 'Comisión del 1% sobre cada pago, desde el inicio.' : '1% fee on every payment, since launch.'}
                    </p>
                    <Rows rows={stats.revenue.earned.map(r => ({ ...r, value: r.amount }))} empty={es ? 'Sin ingresos aún' : 'No revenue yet'} />
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-baseline justify-between mb-1">
                      <h2 className="font-semibold">{es ? 'Sin retirar' : 'Unclaimed'}</h2>
                      <span className="text-2xl font-bold">${fmt(stats.revenue.claimableUsd)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {es ? 'Leído de los contratos ahora mismo.' : 'Read from the contracts right now.'}
                    </p>
                    <Rows rows={stats.revenue.claimable.map(r => ({ ...r, value: r.balance }))} empty={es ? 'Nada pendiente' : 'Nothing pending'} />
                  </div>
                </div>

                {holders.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
                    <h2 className="font-semibold mb-1">{es ? 'Quién puede retirar' : 'Who can withdraw'}</h2>
                    <p className="text-xs text-gray-500 mb-4">
                      {es
                        ? 'Los contratos solo permiten retirar comisiones a estas direcciones. No es una promesa nuestra: está en el AccessManager de cada red.'
                        : 'The contracts only let these addresses withdraw fees. Not a promise from us: it is in each network\'s AccessManager.'}
                    </p>
                    {holders.map(addr => (
                      <a
                        key={addr}
                        href={`${EXPLORERS.celo}${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-mono text-sm text-violet-600 hover:text-violet-700 break-all"
                      >
                        {addr}
                      </a>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-400">
                  {es ? 'Actualizado ' : 'Updated '}
                  {new Date(stats.timestamp).toLocaleString(es ? 'es-CO' : 'en-US')}
                  {es ? ' · se refresca cada minuto' : ' · refreshes every minute'}
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const Rows: React.FC<{
  rows: { network: string; symbol: string; value: string; usd: string }[];
  empty: string;
}> = ({ rows, empty }) => {
  if (rows.length === 0) return <p className="text-sm text-gray-400">{empty}</p>;

  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={`${r.network}:${r.symbol}`} className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {NETWORK_LABELS[r.network] || r.network}
            <span className="text-gray-400"> · {r.symbol}</span>
          </span>
          <span className="font-medium tabular-nums">
            {Number(r.value).toLocaleString('en-US', { maximumFractionDigits: 6 })}
          </span>
        </div>
      ))}
    </div>
  );
};
