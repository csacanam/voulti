import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

/**
 * What an invoice costs in each token it can be paid with.
 *
 * One function for two callers that must never disagree: GET /invoices/:id,
 * which shows the payer the amount, and POST /blockchain/create, which writes
 * the amount the contract will accept. The second used to take the amount from
 * the request body, so anyone could register a $1,000 invoice on-chain for one
 * base unit of USDC, pay that, and earn the merchant a genuine signed Paid
 * webhook — the contract really did see it paid.
 */

export interface PricedToken {
  symbol: string;
  name: string;
  network: string;
  contract_address: string;
  decimals: number;
  rate_to_usd: number;
  /** Rounded the way the payer sees it, and the way it is written on-chain. */
  amount_to_pay: string;
  updated_at: string;
  logo: string | null;
}

export type PricingResult =
  | { ok: true; amountInUSD: number; usdToFiatRate: number; tokens: PricedToken[] }
  | { ok: false; error: string };

export async function priceInvoice(
  invoice: { amount_fiat: number | string; fiat_currency: string; commerce_id: string },
  commerce: { spread: number | string; wallet: string }
): Promise<PricingResult> {
  const { data: fiatRate, error: fiatRateError } = await supabase
    .from('fiat_exchange_rates')
    .select('usd_to_currency_rate')
    .eq('currency_code', invoice.fiat_currency)
    .single();

  if (fiatRateError || !fiatRate) {
    return { ok: false, error: 'Fiat conversion rate not found' };
  }

  const baseAmountInUSD = Number(invoice.amount_fiat) / Number(fiatRate.usd_to_currency_rate);
  const amountInUSD = baseAmountInUSD * (1 + Number(commerce.spread) / 100);

  // `!inner` + the is_active filter is what actually retires a token: flip
  // tokens_addresses.is_active and it stops being offered everywhere, without
  // deleting the per-commerce rows (so re-enabling is one flag, not a
  // reconstruction) and without touching in-flight deposits, which the sweep
  // resolves from its own record rather than from this list.
  const { data: tokensEnabled, error: tokensEnabledError } = await supabase
    .from('tokens_enabled')
    .select(`
      tokens_addresses!inner (
        is_active,
        network,
        contract_address,
        decimals,
        token_symbol,
        tokens (
          name,
          symbol,
          rate_to_usd,
          updated_at,
          source,
          logo
        )
      )
    `)
    .eq('commerce_id', invoice.commerce_id)
    .eq('tokens_addresses.is_active', true);

  if (tokensEnabledError || !tokensEnabled) {
    return { ok: false, error: 'Error fetching enabled tokens' };
  }

  // Only tokens actually whitelisted on-chain for this commerce.
  // NOTE: network names are normalised to lowercase — the DB stores "Celo".
  const { getCommerceNetworkStatus } = await import('./commerceNetworks');
  const networkStatus = await getCommerceNetworkStatus(commerce.wallet);
  const allowed = new Set<string>();
  for (const ns of networkStatus) {
    if (!ns.active) continue;
    for (const t of ns.tokens) {
      if (t.whitelisted) allowed.add(`${ns.network.toLowerCase()}:${t.address.toLowerCase()}`);
    }
  }

  const tokens = tokensEnabled
    .map((tokenEnabled): PricedToken | null => {
      const addr = tokenEnabled.tokens_addresses as any;
      const token = addr.tokens as any;

      const key = `${addr.network.toLowerCase()}:${addr.contract_address.toLowerCase()}`;
      if (!allowed.has(key)) return null;

      const amountInToken = amountInUSD / Number(token.rate_to_usd);
      const displayDecimals = Math.min(addr.decimals, amountInToken >= 1000 ? 2 : 6);

      return {
        symbol: token.symbol,
        name: token.name,
        network: addr.network,
        contract_address: addr.contract_address,
        decimals: addr.decimals,
        rate_to_usd: token.rate_to_usd,
        amount_to_pay: amountInToken.toFixed(displayDecimals),
        updated_at: token.updated_at,
        logo: token.logo,
      };
    })
    .filter((t): t is PricedToken => t !== null);

  return { ok: true, amountInUSD, usdToFiatRate: fiatRate.usd_to_currency_rate, tokens };
}
