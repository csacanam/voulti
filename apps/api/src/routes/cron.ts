/**
 * Cron / monitoring routes for Voulti.
 *
 * GET /cron/health — checks operator wallet gas balances on all 5 networks,
 * sends Telegram alerts when thresholds are breached, and emits a
 * status report every 12 hours.
 *
 * Call externally every 5 minutes (e.g. via cron-job.org).
 */

import { FastifyInstance } from 'fastify';
import { ethers } from 'ethers';
import { NETWORKS } from '../blockchain/config/networks';
import { sendTelegramAlert } from '../utils/notify';

// ─── Thresholds (native gas token per network) ─────────────────────────

const THRESHOLDS: Record<string, { warning: number; critical: number }> = {
  celo:     { warning: 0.5,   critical: 0.1    },
  arbitrum: { warning: 0.002, critical: 0.0005 },
  polygon:  { warning: 1.0,   critical: 0.2    },
  base:     { warning: 0.002, critical: 0.0005 },
  bsc:      { warning: 0.005, critical: 0.001  },
};

const STATUS_REPORT_INTERVAL = 144; // cycles (5 min × 144 = 12 hours)

// ─── Module-level state ────────────────────────────────────────────────

let cronCycleCount = 0;
const lastAlertState = new Map<string, string>();

// ─── Helpers ───────────────────────────────────────────────────────────

function evaluateLevel(balance: number, warning: number, critical: number): string | null {
  if (balance < critical) return 'critical';
  if (balance < warning) return 'warning';
  return null;
}

function formatDecimals(balance: number, symbol: string): string {
  if (symbol === 'ETH') return balance.toFixed(6);
  if (symbol === 'BNB') return balance.toFixed(5);
  return balance.toFixed(4);
}

function formatAlert(
  level: string, network: string, balance: number, symbol: string,
  warning: number, critical: number, address: string, explorer: string
): string {
  const emoji = level === 'critical' ? '🚨' : '⚠️';
  const tag = level === 'critical' ? 'CRITICAL' : 'WARNING';
  const action = level === 'critical' ? 'Action required' : 'Action recommended';

  return [
    `<b>${emoji} ${tag}: Operator (${network}) Balance Low</b>`,
    '',
    `Current: ${formatDecimals(balance, symbol)} ${symbol}`,
    `Critical: ${critical} ${symbol}`,
    `Warning: ${warning} ${symbol}`,
    '',
    `Wallet: <code>${address}</code>`,
    `${explorer}/address/${address}`,
    '',
    `<b>${action}:</b> Send ${symbol} to this wallet.`,
  ].join('\n');
}

function formatStatusReport(
  wallets: { network: string; symbol: string; balance: number; level: string | null }[],
  address: string
): string {
  const statusLabel = (level: string | null) =>
    level === 'critical' ? '🔴 CRITICAL' : level === 'warning' ? '🟡 WARNING' : '🟢 OK';

  const lines = [
    '<b>📊 Voulti Status Report</b>',
    '',
    ...wallets.map(w =>
      `<b>Operator (${w.network}):</b> ${formatDecimals(w.balance, w.symbol)} ${w.symbol}  ${statusLabel(w.level)}`
    ),
    '',
    `Wallet: <code>${address}</code>`,
  ];

  return lines.join('\n');
}

// ─── Routes ────────────────────────────────────────────────────────────

export async function cronRoutes(app: FastifyInstance) {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) {
    console.warn('[cron] BACKEND_PRIVATE_KEY not set — monitoring disabled');
    app.get('/health', async (_req, reply) => {
      return reply.send({ ok: false, error: 'BACKEND_PRIVATE_KEY not configured' });
    });
    return;
  }

  const operatorAddress = new ethers.Wallet(backendKey).address;

  // Production networks only (skip hardhat)
  const prodNetworks = Object.entries(NETWORKS).filter(([name]) => name !== 'hardhat');

  app.get('/health', async (_req, reply) => {
    try {
      // Step 1: Fetch all native balances in parallel
      const balanceResults = await Promise.all(
        prodNetworks.map(async ([name, config]) => {
          try {
            const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
              name: config.name,
              chainId: config.chainId,
            });
            const raw = await provider.getBalance(operatorAddress);
            const balance = parseFloat(ethers.formatEther(raw));
            return { network: name, symbol: config.nativeCurrency.symbol, balance, error: null };
          } catch (err: any) {
            console.error(`[cron] Balance read error on ${name}:`, err.message);
            return { network: name, symbol: config.nativeCurrency.symbol, balance: -1, error: err.message };
          }
        })
      );

      // Step 2: Evaluate thresholds and build alerts
      const alerts: { key: string; level: string; msg: string }[] = [];

      for (const result of balanceResults) {
        const threshold = THRESHOLDS[result.network];
        if (!threshold || result.balance < 0) continue;

        const level = evaluateLevel(result.balance, threshold.warning, threshold.critical);
        const prev = lastAlertState.get(result.network);

        if (!level) {
          lastAlertState.delete(result.network);
        } else if (level !== prev) {
          const config = NETWORKS[result.network as keyof typeof NETWORKS];
          alerts.push({
            key: result.network,
            level,
            msg: formatAlert(
              level, result.network, result.balance, result.symbol,
              threshold.warning, threshold.critical,
              operatorAddress, config.blockExplorer
            ),
          });
          lastAlertState.set(result.network, level);
        }
      }

      // Step 3: Send alerts (critical first)
      alerts.sort((a, b) => (a.level === 'critical' ? -1 : 1) - (b.level === 'critical' ? -1 : 1));
      for (const a of alerts) {
        await sendTelegramAlert(a.key, a.msg);
      }

      // Step 4: Status report every N cycles
      cronCycleCount += 1;
      let statusSent = false;

      if (process.env.CRON_STATUS_REPORT === 'true' && cronCycleCount >= STATUS_REPORT_INTERVAL) {
        cronCycleCount = 0;

        const walletSummary = balanceResults
          .filter(r => r.balance >= 0)
          .map(r => ({
            network: r.network,
            symbol: r.symbol,
            balance: r.balance,
            level: THRESHOLDS[r.network]
              ? evaluateLevel(r.balance, THRESHOLDS[r.network].warning, THRESHOLDS[r.network].critical)
              : null,
          }));

        await sendTelegramAlert('status_report', formatStatusReport(walletSummary, operatorAddress));
        statusSent = true;
      }

      // Step 5: JSON response
      const networkStatus: Record<string, { balance: number; symbol: string; healthy: boolean; error?: string }> = {};
      for (const r of balanceResults) {
        const threshold = THRESHOLDS[r.network];
        networkStatus[r.network] = {
          balance: r.balance,
          symbol: r.symbol,
          healthy: r.balance >= 0 && threshold ? r.balance >= threshold.warning : true,
          ...(r.error ? { error: r.error } : {}),
        };
      }

      return reply.send({
        ok: true,
        timestamp: new Date().toISOString(),
        operator: operatorAddress,
        networks: networkStatus,
        alerts_sent: alerts.length,
        status_report_sent: statusSent,
        cycle: cronCycleCount,
      });
    } catch (err: any) {
      console.error('[cron/health]', err);
      return reply.status(500).send({ ok: false, error: err.message });
    }
  });

  // ── Test: send all alert types with real balances ──────────────────────
  app.get('/test-alerts', async (_req, reply) => {
    try {
      const balanceResults = await Promise.all(
        prodNetworks.map(async ([name, config]) => {
          try {
            const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
              name: config.name,
              chainId: config.chainId,
            });
            const raw = await provider.getBalance(operatorAddress);
            return { network: name, symbol: config.nativeCurrency.symbol, balance: parseFloat(ethers.formatEther(raw)) };
          } catch {
            return { network: name, symbol: config.nativeCurrency.symbol, balance: 0 };
          }
        })
      );

      const messages: { key: string; msg: string }[] = [];

      // Send a sample warning and critical
      const first = balanceResults[0];
      const threshold = THRESHOLDS[first.network];
      if (threshold) {
        messages.push({
          key: 'test_warning',
          msg: formatAlert('warning', first.network, first.balance, first.symbol, threshold.warning, threshold.critical, operatorAddress, NETWORKS[first.network as keyof typeof NETWORKS].blockExplorer),
        });
        messages.push({
          key: 'test_critical',
          msg: formatAlert('critical', first.network, first.balance, first.symbol, threshold.warning, threshold.critical, operatorAddress, NETWORKS[first.network as keyof typeof NETWORKS].blockExplorer),
        });
      }

      // Status report
      messages.push({
        key: 'test_status',
        msg: formatStatusReport(
          balanceResults.map(r => ({
            network: r.network,
            symbol: r.symbol,
            balance: r.balance,
            level: THRESHOLDS[r.network] ? evaluateLevel(r.balance, THRESHOLDS[r.network].warning, THRESHOLDS[r.network].critical) : null,
          })),
          operatorAddress
        ),
      });

      const results: { key: string; sent: boolean }[] = [];
      for (const m of messages) {
        const sent = await sendTelegramAlert(m.key, m.msg);
        results.push({ key: m.key, sent });
      }

      return reply.send({ ok: true, results });
    } catch (err: any) {
      console.error('[cron/test-alerts]', err);
      return reply.status(500).send({ ok: false, error: err.message });
    }
  });
}
