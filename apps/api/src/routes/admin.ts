// src/routes/admin.ts
/**
 * Operator-only recovery endpoints.
 *
 * Both retry counters in the system are one-way doors: `sweep_retries` past
 * MAX_RETRIES drops the deposit out of SweepService's poll query, and
 * `confirmation_url_retries` past 5 drops the invoice out of the webhook
 * worker's. Once either trips, the only way back used to be editing Supabase
 * by hand — which is exactly the kind of thing you end up doing at 6am with
 * a customer's money sitting in an HD address.
 *
 * Guarded by a shared secret in `x-admin-secret`. With ADMIN_SECRET unset the
 * routes refuse to run at all rather than defaulting to open.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';
import { sweepService } from '../blockchain/services/SweepService';
import { whitelistCommerceOnChain } from './commerces';
import { getCommerceNetworkStatus } from '../business/commerceNetworks';
import { sendTelegramAlert } from '../utils/notify';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

function checkSecret(req: FastifyRequest, res: FastifyReply): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    // 501, not 503: DigitalOcean App Platform reads a 503 from the app as
    // "upstream is unhealthy" and swallows the response, handing the caller its
    // own error page instead of ours. Never return 503 from a handler here.
    res.status(501).send({ error: 'ADMIN_SECRET not configured — admin routes disabled' });
    return false;
  }

  const provided = req.headers['x-admin-secret'];
  const given = Buffer.from(typeof provided === 'string' ? provided : '');
  const want = Buffer.from(expected);

  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    res.status(401).send({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export async function adminRoutes(app: FastifyInstance) {
  /**
   * Put a stuck invoice back in the queues.
   *
   * Body: { sweep?: boolean, webhook?: boolean } — both default to true.
   * Idempotent, and safe to call on a healthy invoice: deposits already
   * `swept`/`refunded` are left alone so a retry can't undo a settled payment.
   */
  app.post<{
    Params: { id: string };
    Body: { sweep?: boolean; webhook?: boolean };
  }>('/invoices/:id/retry', async (req, res) => {
    if (!checkSecret(req, res)) return;

    const { id } = req.params;
    const { sweep = true, webhook = true } = req.body || {};
    const result: Record<string, unknown> = { invoice_id: id };

    try {
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('id', id)
        .single();

      if (invErr || !invoice) {
        return res.status(404).send({ error: 'Invoice not found' });
      }
      result.status = invoice.status;

      if (sweep) {
        const { data: deposits } = await supabase
          .from('deposit_addresses')
          .select('*')
          .eq('invoice_id', id);

        const revived: string[] = [];
        for (const deposit of deposits || []) {
          if (deposit.status === 'swept' || deposit.status === 'refunded') continue;

          // Back to where the state machine can act on it: `detected` if we
          // already saw tokens land, `awaiting` if we never did.
          const next = deposit.detected_amount ? 'detected' : 'awaiting';

          await supabase
            .from('deposit_addresses')
            .update({ status: next, sweep_retries: 0, sweep_error: null })
            .eq('id', deposit.id);

          revived.push(`${deposit.id} (${deposit.status} → ${next})`);
        }
        result.deposits_reset = revived;
      }

      if (webhook) {
        await supabase
          .from('invoices')
          .update({ confirmation_url_retries: 0, confirmation_url_response: false })
          .eq('id', id);
        result.webhook_reset = true;
      }

      console.log(`[admin] Retry requested for invoice ${id}:`, result);
      return res.send({ success: true, ...result });
    } catch (err: any) {
      console.error('[admin] Retry failed:', err);
      return res.status(500).send({ error: err.message || 'Retry failed' });
    }
  });

  /**
   * Re-run on-chain whitelisting for a commerce, or for every commerce.
   *
   * Signup already whitelists on all networks, but it runs detached from the
   * response, so a single failed transaction used to leave a merchant unable
   * to take payments on that network with only a log line to show for it. This
   * is the repair: it is idempotent, so running it over everyone is safe, and
   * it reports the resulting on-chain status rather than just claiming success.
   *
   * POST /admin/commerces/all/whitelist to sweep every commerce.
   */
  app.post<{ Params: { id: string } }>('/commerces/:id/whitelist', async (req, res) => {
    if (!checkSecret(req, res)) return;

    try {
      const { id } = req.params;
      let wallets: { id: string; name: string; wallet: string }[] = [];

      if (id === 'all') {
        const { data } = await supabase.from('commerces').select('id, name, wallet');
        wallets = data || [];
      } else {
        const { data } = await supabase
          .from('commerces')
          .select('id, name, wallet')
          // Accept either the commerce id or its wallet, since the alert that
          // sends an operator here only knows the wallet.
          .or(`id.eq.${id},wallet.eq.${id.toLowerCase()}`)
          .limit(1);

        if (!data || data.length === 0) {
          return res.status(404).send({ error: 'Commerce not found' });
        }
        wallets = data;
      }

      // Repairing every commerce means on-chain reads plus transactions per
      // network, which runs far past DigitalOcean's gateway timeout — the
      // caller gets a 503 while the work is still going, with no report. Do it
      // detached and deliver the summary over Telegram instead.
      if (wallets.length > 1) {
        const total = wallets.length;
        runRepair(wallets)
          .then(report => {
            const done = report.filter((r: any) => r.skipped).length;
            const fixed = report.filter((r: any) => r.repaired?.length).length;
            const bad = report.filter((r: any) => r.failed?.length);

            return sendTelegramAlert(
              'whitelist_repair_done',
              [
                '🔧 <b>Reparación de whitelist terminada</b>',
                '',
                `<b>Comercios:</b> ${total}`,
                `<b>Ya completos:</b> ${done}`,
                `<b>Reparados:</b> ${fixed}`,
                `<b>Con fallos:</b> ${bad.length}`,
                ...(bad.length
                  ? ['', ...bad.slice(0, 10).map((r: any) => `<code>${r.commerce}: ${r.failed.join(' | ')}</code>`)]
                  : []),
              ].join('\n')
            );
          })
          .catch(err => console.error('[admin] Repair run failed:', err));

        return res.status(202).send({
          success: true,
          started: total,
          message: 'Repair running in background — summary will arrive on Telegram',
        });
      }

      const report = await runRepair(wallets);
      console.log('[admin] Whitelist repair:', JSON.stringify(report));
      return res.send({ success: true, commerces: report.length, report });
    } catch (err: any) {
      console.error('[admin] Whitelist repair failed:', err);
      return res.status(500).send({ error: err.message || 'Whitelist repair failed' });
    }
  });

  async function runRepair(wallets: { id: string; name: string; wallet: string }[]) {
      const report: any[] = [];
      for (const c of wallets) {
        // Look before writing. Whitelisting is idempotent on-chain but not
        // free: blindly re-running over every commerce spends gas on ~170
        // transactions that only set flags already set — and this wallet is
        // the same one that funds deposit sweeps, so wasting its balance
        // eventually stops real payments from settling.
        let missing: string[] | undefined;
        try {
          const status = await getCommerceNetworkStatus(c.wallet);
          missing = status
            // An unreadable network is not a missing one. Whitelisting it
            // "just in case" costs gas from the same wallet that funds deposit
            // sweeps, and reporting it as repaired would be a guess dressed up
            // as a fact. Leave it out and let the next run, on a healthy RPC,
            // decide.
            .filter((n: any) => !n.readError)
            .filter((n: any) => !n.active || !n.tokens.some((t: any) => t.whitelisted))
            .map((n: any) => n.network);
        } catch {
          // Read failed (public RPCs rate-limit). Not knowing is not a reason
          // to skip a commerce that might genuinely be missing a network, so
          // fall back to attempting all of them.
          missing = undefined;
        }

        if (missing && missing.length === 0) {
          report.push({ commerce: c.name, wallet: c.wallet, skipped: 'already complete' });
          continue;
        }

        const results = await whitelistCommerceOnChain(c.wallet.toLowerCase(), missing);

        report.push({
          commerce: c.name,
          wallet: c.wallet,
          attempted: missing ?? 'all (status unreadable)',
          repaired: results.filter(r => r.success).map(r => r.network),
          failed: results.filter(r => !r.success).map(r => `${r.network}: ${r.error}`),
        });
      }

    console.log('[admin] Whitelist repair:', JSON.stringify(report));
    return report;
  }

  /**
   * Pull leftover native token out of an HD deposit address.
   * Sweeps now do this automatically, but addresses funded before that (or
   * left mid-failure) still hold gas nothing else will ever reach.
   */
  app.post<{ Params: { id: string } }>('/deposits/:id/return-gas', async (req, res) => {
    if (!checkSecret(req, res)) return;

    try {
      const result = await sweepService.recoverLeftoverGas(req.params.id);
      console.log(`[admin] Leftover gas recovery for deposit ${req.params.id}:`, result);
      return res.send({ success: true, ...result });
    } catch (err: any) {
      console.error('[admin] Gas recovery failed:', err);
      return res.status(500).send({ error: err.message || 'Gas recovery failed' });
    }
  });
}
