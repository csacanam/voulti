import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { InvoiceService } from '../blockchain/services/InvoiceServices';
import { NETWORKS } from '../blockchain/config/networks';
import { getProvider } from '../blockchain/utils/web3';
import { CONTRACTS } from '../blockchain/config/contracts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function invoicesRoutes(app: FastifyInstance) {
  // Create invoice in Supabase (public — commerce page + authenticated merchant dashboard)
  app.post('/', async (req: AuthenticatedRequest, res) => {
    try {
      const body = (req.body || {}) as any;
      const { commerce_id, amount_fiat, expires_at, reference, description } = body;
      // `fiat_currency` accepted as an alias: it is the name the field carries
      // in every response, so integrators reach for it first.
      const currency = body.currency ?? body.fiat_currency;

      // Validate required fields
      if (!commerce_id || amount_fiat === undefined || amount_fiat === null) {
        return res.status(400).send({
          error: 'Missing required fields: commerce_id, amount_fiat'
        });
      }

      // `!amount_fiat` alone let a negative through (it is truthy) and sent a
      // non-numeric one all the way to the insert, where it surfaced as an
      // opaque 500 instead of telling the caller what was wrong.
      if (typeof amount_fiat !== 'number' || !Number.isFinite(amount_fiat) || amount_fiat <= 0) {
        return res.status(400).send({
          error: 'amount_fiat must be a positive number'
        });
      }

      // Optional reference/memo (integrator's own mapping, e.g. order id or client name)
      if (reference !== undefined && (typeof reference !== 'string' || reference.length > 200)) {
        return res.status(400).send({
          error: 'reference must be a string of at most 200 characters'
        });
      }

      // Long enough for an itemised charge — "2x plato, 1x postre, domicilio…"
      // runs past a tweet and is perfectly normal. How much of it the checkout
      // shows is a presentation problem, solved with CSS, not by rejecting what
      // the merchant needs to say.
      if (description !== undefined && (typeof description !== "string" || description.length > 300)) {
        return res.status(400).send({
          error: "description must be a string of at most 300 characters"
        });
      }

      // A past expires_at used to be accepted, creating an invoice that was
      // already dead: the payer got a link that never worked and nobody found
      // out until the expiry sweep marked it Expired. Fail loudly instead.
      if (expires_at !== undefined && expires_at !== null) {
        const expiry = new Date(expires_at);

        if (Number.isNaN(expiry.getTime())) {
          return res.status(400).send({
            error: 'expires_at must be a valid ISO 8601 date'
          });
        }

        if (expiry.getTime() <= Date.now()) {
          return res.status(400).send({
            error: 'expires_at must be in the future'
          });
        }
      }

      // Validate commerce exists and get its currency and confirmation_url
      const { data: commerce, error: commerceError } = await supabase
        .from('commerces')
        .select('id, name, wallet, minAmount, maxAmount, currency, confirmation_url, confirmation_email')
        .eq('id', commerce_id)
        .single();

      if (commerceError || !commerce) {
        return res.status(404).send({
          error: 'Commerce not found'
        });
      }

      // Price in whatever currency the caller asks for. The commerce's own
      // currency only decides the unit its dashboard totals are shown in, so
      // it is deliberately NOT used as a fallback here: inferring a price
      // currency from a display setting is how "50" quietly becomes dollars
      // for one merchant and pesos for another. Make the caller say it.
      if (currency === undefined || currency === null || currency === '') {
        return res.status(400).send({
          error: 'currency is required — the price currency is chosen per invoice, not taken from the commerce'
        });
      }

      const fiat_currency = String(currency).toUpperCase();

      const { data: rate } = await supabase
        .from('fiat_exchange_rates')
        .select('currency_code, usd_to_currency_rate')
        .eq('currency_code', fiat_currency)
        .single();

      if (!rate) {
        const { data: supported } = await supabase
          .from('fiat_exchange_rates')
          .select('currency_code')
          .order('currency_code');

        return res.status(400).send({
          error: `Unsupported currency "${fiat_currency}". Supported: ${(supported || []).map((c: any) => c.currency_code).join(', ')}`
        });
      }

      // Limits are stored in the commerce's own currency, so comparing raw
      // numbers against an invoice priced in a different one would be
      // meaningless (5000 COP is not 5000 EUR). Compare in USD instead.
      if (commerce.minAmount || commerce.maxAmount) {
        const limitCurrency = commerce.currency || fiat_currency;
        let limitRate = rate;

        if (limitCurrency !== fiat_currency) {
          const { data: other } = await supabase
            .from('fiat_exchange_rates')
            .select('usd_to_currency_rate')
            .eq('currency_code', limitCurrency)
            .single();
          if (other) limitRate = other as any;
        }

        const amountUsd = amount_fiat / Number(rate.usd_to_currency_rate);
        const toUsd = (v: number) => v / Number(limitRate.usd_to_currency_rate);

        if (commerce.minAmount && amountUsd < toUsd(Number(commerce.minAmount))) {
          return res.status(400).send({
            error: `Amount must be at least ${commerce.minAmount} ${limitCurrency}`
          });
        }

        if (commerce.maxAmount && amountUsd > toUsd(Number(commerce.maxAmount))) {
          return res.status(400).send({
            error: `Amount must be at most ${commerce.maxAmount} ${limitCurrency}`
          });
        }
      }

      // Set expiration time - 1 hour from now if not provided
      const expirationTime = expires_at || new Date(Date.now() + 60 * 60 * 1000).toISOString();

      // Create invoice in database
      // Block invoice creation if commerce is not active on any network on-chain
      const { getCommerceNetworkStatus } = await import('../business/commerceNetworks');
      const networkStatus = await getCommerceNetworkStatus(commerce.wallet);
      const anyActive = networkStatus.some(n => n.active && n.tokens.some(t => t.whitelisted));
      if (!anyActive) {
        return res.status(400).send({
          error: 'Commerce is not enabled on any network. Please enable at least one network in your account settings.'
        });
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          commerce_id,
          amount_fiat,
          fiat_currency,
          status: 'Pending',
          expires_at: expirationTime,
          confirmation_url_available: commerce.confirmation_url !== null,
          confirmation_email_available: commerce.confirmation_email !== null,
          ...(reference !== undefined ? { reference } : {}),
          ...(description !== undefined ? { description } : {})
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        return res.status(500).send({
          error: 'Failed to create invoice'
        });
      }

      return res.status(201).send({
        success: true,
        data: {
          id: invoice.id,
          commerce_id: invoice.commerce_id,
          amount_fiat: invoice.amount_fiat,
          fiat_currency: invoice.fiat_currency,
          status: invoice.status,
          expires_at: invoice.expires_at,
          created_at: invoice.created_at,
          reference: invoice.reference ?? null,
          description: invoice.description ?? null,
          confirmation_url_available: invoice.confirmation_url_available,
          confirmation_email_available: invoice.confirmation_email_available
        }
      });

    } catch (error: any) {
      console.error('Create invoice error:', error);
      return res.status(500).send({
        error: error.message || 'Failed to create invoice'
      });
    }
  });

  // List invoices by commerce (authenticated + verify ownership)
  app.get('/by-commerce/:commerceId', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { commerceId } = req.params as { commerceId: string };

      if (!commerceId) {
        return res.status(400).send({ error: 'commerceId is required' });
      }

      // Verify the authenticated user owns this commerce
      const { data: commerceCheck } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', commerceId)
        .single();

      if (!commerceCheck || commerceCheck.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const commerce_id = commerceId;

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, commerce_id, amount_fiat, fiat_currency, status, expires_at, created_at, paid_at, payment_method, reference, description, payer_address, paid_tx_hash, paid_network')
        .eq('commerce_id', commerce_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return res.status(500).send({ error: 'Failed to fetch invoices' });
      }

      return res.send({ data: invoices || [] });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to fetch invoices' });
    }
  });

  // Get invoice by ID
  app.get('/:id', async (req, res) => {
    const { id } = req.params as { id: string };

          // 1. Get the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, selected_network, blockchain_invoice_id')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).send({ error: 'Invoice not found' });
    }

          // 1.1. Get commerce name separately
    const { data: commerce, error: commerceError } = await supabase
      .from('commerces')
      .select('name, spread, wallet, icon_url')
      .eq('id', invoice.commerce_id)
      .single();

    if (commerceError || !commerce) {
      return res.status(500).send({ error: 'Commerce not found' });
    }

    // 2. Get fiat to USD conversion rate
    const { data: fiatRate, error: fiatRateError } = await supabase
      .from('fiat_exchange_rates')
      .select('usd_to_currency_rate')
      .eq('currency_code', invoice.fiat_currency)
      .single();

    if (fiatRateError || !fiatRate) {
      return res.status(500).send({ error: 'Fiat conversion rate not found' });
    }

    const baseAmountInUSD = Number(invoice.amount_fiat) / Number(fiatRate.usd_to_currency_rate);
    const amountInUSD = baseAmountInUSD * (1 + Number(commerce.spread) / 100);

    // 3. Get enabled tokens for the commerce
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
      return res.status(500).send({ error: 'Error fetching enabled tokens' });
    }

    // 3.5. Read actual on-chain whitelist status per network
    const { getCommerceNetworkStatus } = await import('../business/commerceNetworks');
    const networkStatus = await getCommerceNetworkStatus(commerce.wallet);
    // Build a set of allowed (network, tokenAddress) for fast lookup
    // NOTE: normalize network name to lowercase — DB stores "Celo" but code uses "celo"
    const allowed = new Set<string>();
    for (const ns of networkStatus) {
      if (!ns.active) continue;
      for (const t of ns.tokens) {
        if (t.whitelisted) allowed.add(`${ns.network.toLowerCase()}:${t.address.toLowerCase()}`);
      }
    }

    // 4. Build token response — only include tokens actually whitelisted on-chain
    const tokens = tokensEnabled
      .map((tokenEnabled) => {
        const addr = tokenEnabled.tokens_addresses as any;
        const token = addr.tokens as any;

        const key = `${addr.network.toLowerCase()}:${addr.contract_address.toLowerCase()}`;
        if (!allowed.has(key)) return null;

        const amountInToken = amountInUSD / Number(token.rate_to_usd);
        const displayDecimals = Math.min(addr.decimals, amountInToken >= 1000 ? 2 : 6);
        const amountFormatted = amountInToken.toFixed(displayDecimals);

        return {
          symbol: token.symbol,
          name: token.name,
          network: addr.network,
          contract_address: addr.contract_address,
          decimals: addr.decimals,
          rate_to_usd: token.rate_to_usd,
          amount_to_pay: amountFormatted,
          updated_at: token.updated_at,
          logo: token.logo
        };
      })
      .filter(Boolean);

    // 5. Respond with all data
    return res.send({
      id: invoice.id,
      commerce_id: invoice.commerce_id,
      amount_fiat: invoice.amount_fiat,
      fiat_currency: invoice.fiat_currency,
      status: invoice.status,
      expires_at: invoice.expires_at,
      description: invoice.description ?? null,
      amount_usd: amountInUSD.toFixed(2),
      usd_to_fiat_rate: fiatRate.usd_to_currency_rate,
      commerce_name: commerce.name,
      commerce_icon_url: commerce.icon_url,
      commerce_wallet: commerce.wallet,
      tokens,
      paid_token: invoice.paid_token,
      paid_network: invoice.paid_network,
      paid_tx_hash: invoice.paid_tx_hash,
      wallet_address: invoice.wallet_address,
      paid_at: invoice.paid_at,
      paid_amount: invoice.paid_amount,
      selected_network: invoice.selected_network,
      blockchain_invoice_id: invoice.blockchain_invoice_id
    });
  });

  // Admin endpoint to check tokens in both backend and blockchain
  app.get('/admin/commerce-tokens/:commerceId', async (req, res) => {
    try {
      const { commerceId } = req.params as { commerceId: string };
      const { network, supportsENS } = req.query as { network: string; supportsENS?: string };

      // Validate network parameter
      if (!network) {
        return res.status(400).send({
          error: 'Missing required parameter: network'
        });
      }

      // Validate network
      if (!NETWORKS[network as keyof typeof NETWORKS]) {
        return res.status(400).send({
          error: `Invalid network: ${network}. Supported networks: ${Object.keys(NETWORKS).join(', ')}`
        });
      }

      // Convert supportsENS string to boolean
      const supportsENSBool = supportsENS === 'true' ? true : supportsENS === 'false' ? false : undefined;

      // Create invoice service for the specified network with ENS support configuration
      const invoiceService = new InvoiceService(network as keyof typeof NETWORKS, supportsENSBool);
      await invoiceService.init(process.env.PRIVATE_KEY!);

      // Known tokens to test
      const knownTokens = [
        "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4", // cCOP
        "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1", // cUSD
        "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F", // cEUR
        "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B"  // USDC
      ];

      // Get commerce info from backend to get blockchain address
      const { data: commerce, error: commerceError } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', commerceId)
        .single();

      if (commerceError || !commerce) {
        return res.status(404).send({
          error: 'Commerce not found in backend'
        });
      }

      const commerceAddress = commerce.wallet;

      // Get backend tokens for this commerce
      const { data: backendTokens, error: backendError } = await supabase
        .from('tokens_enabled')
        .select(`
          tokens_addresses (
            contract_address,
            token_symbol,
            network,
            is_active
          )
        `)
        .eq('commerce_id', commerceId);

      if (backendError) {
        return res.status(500).send({
          error: 'Failed to fetch backend tokens'
        });
      }

      const backendTokenAddresses = (backendTokens || []).map((item: any) => 
        item.tokens_addresses.contract_address.toLowerCase()
      );

      // Check each token in both backend and blockchain
      const results = [];
      const inconsistencies = [];

      for (const token of knownTokens) {
        const tokenLower = token.toLowerCase();
        
        // Check backend
        const backendEnabled = backendTokenAddresses.includes(tokenLower);
        
        // Check blockchain
        const blockchainWhitelisted = await invoiceService.isTokenWhitelistedForCommerce(commerceAddress, token);

        // Detect inconsistencies
        if (backendEnabled && !blockchainWhitelisted) {
                  inconsistencies.push(`${getTokenSymbol(token)}: Enabled in backend but NOT whitelisted in blockchain`);
      } else if (!backendEnabled && blockchainWhitelisted) {
        inconsistencies.push(`${getTokenSymbol(token)}: Whitelisted in blockchain but NOT enabled in backend`);
        }

        results.push({
          token,
          symbol: getTokenSymbol(token),
          backend: {
            enabled: backendEnabled,
            active: backendEnabled
          },
          blockchain: {
            whitelisted: blockchainWhitelisted
          },
          status: backendEnabled && blockchainWhitelisted ? '✅ Consistent' : 
                 backendEnabled && !blockchainWhitelisted ? '⚠️ Backend Only' :
                 !backendEnabled && blockchainWhitelisted ? '⚠️ Blockchain Only' : '❌ Not Available'
        });
      }

      return res.send({
        success: true,
        data: {
          commerceId,
          commerceAddress,
          network,
          tokens: results,
          summary: {
            total: results.length,
            consistent: results.filter(r => r.status === '✅ Consistente').length,
            backendOnly: results.filter(r => r.status === '⚠️ Solo Backend').length,
            blockchainOnly: results.filter(r => r.status === '⚠️ Solo Blockchain').length,
            notAvailable: results.filter(r => r.status === '❌ No Disponible').length
          },
          inconsistencies: inconsistencies.length > 0 ? inconsistencies : undefined
        }
      });

    } catch (error: any) {
      console.error('Error checking commerce tokens:', error);
      return res.status(500).send({
        error: error.message || 'Failed to check commerce tokens'
      });
    }
  });

  // Update invoice status in backend only (admin endpoint, authenticated)
  app.put('/:id/status', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };
      const { status, reason } = req.body as { status: string; reason?: string };

      // Validate required fields
      if (!status) {
        return res.status(400).send({
          error: 'Missing required field: status'
        });
      }

      // Validate status values
      const validStatuses = ['Pending', 'Paid', 'Expired', 'Refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).send({
          error: `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`
        });
      }

      // Check if invoice exists
      const { data: existingInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('id, status, commerce_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingInvoice) {
        return res.status(404).send({
          error: 'Invoice not found'
        });
      }

      // Prepare update data
      const updateData: any = {
        status: status
      };

      // Add timestamp based on status
      switch (status) {
        case 'Paid':
          updateData.paid_at = new Date().toISOString();
          break;
        case 'Expired':
          updateData.expired_at = new Date().toISOString();
          break;
        case 'Refunded':
          updateData.refunded_at = new Date().toISOString();
          break;
      }

      // Update invoice status
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating invoice status:', updateError);
        return res.status(500).send({
          error: 'Failed to update invoice status'
        });
      }

      // Log the status change for audit
      console.log(`Invoice ${id} status changed from ${existingInvoice.status} to ${status}${reason ? ` - Reason: ${reason}` : ''}`);

      return res.send({
        success: true,
        data: {
          id: updatedInvoice.id,
          previousStatus: existingInvoice.status,
          newStatus: updatedInvoice.status,
          reason: reason || null
        },
        message: `Invoice status updated from ${existingInvoice.status} to ${status}`
      });

    } catch (error: any) {
      console.error('Error updating invoice status:', error);
      return res.status(500).send({
        error: error.message || 'Failed to update invoice status'
      });
    }
  });

    // Update invoice payment data from blockchain (admin endpoint)
    app.put("/:id/payment-data", async (req, res) => {
      try {
        const { id } = req.params as { id: string };
        const { 
          paid_token, 
          paid_network, 
          paid_tx_hash, 
          wallet_address, 
          paid_amount, 
          reason 
        } = req.body as { 
          paid_token: string; 
          paid_network: string; 
          paid_tx_hash: string; 
          wallet_address: string; 
          paid_amount: number; 
          reason?: string; 
        };
  
        // Validate required fields
        if (!paid_token || !paid_network || !paid_tx_hash || !wallet_address || paid_amount === undefined) {
          return res.status(400).send({
            error: "Missing required fields: paid_token, paid_network, paid_tx_hash, wallet_address, paid_amount"
          });
        }
  
        // Check if invoice exists and get commerce wallet
        const { data: existingInvoice, error: fetchError } = await supabase
          .from("invoices")
          .select("id, status, commerce_id, paid_token, paid_network, paid_tx_hash, wallet_address, paid_amount, paid_at")
          .eq("id", id)
          .single();

        if (fetchError || !existingInvoice) {
          return res.status(404).send({
            error: "Invoice not found"
          });
        }

        // Read fee % from contract for this commerce
        let feePercent = 100; // default 1%
        try {
          const { data: commerce } = await supabase
            .from('commerces')
            .select('wallet')
            .eq('id', existingInvoice.commerce_id)
            .single();

          if (commerce?.wallet && paid_network) {
            const networkConfig = NETWORKS[paid_network as keyof typeof NETWORKS];
            const contracts = CONTRACTS[paid_network];
            if (networkConfig && contracts) {
              const provider = getProvider(paid_network);
              const accessManager = new ethers.Contract(contracts.ACCESS_MANAGER, [
                'function getCommerceFee(address commerce) view returns (uint256)',
              ], provider);
              feePercent = Number(await accessManager.getCommerceFee(commerce.wallet));
            }
          }
        } catch {
          // fallback to default
        }
        const feeAmount = (paid_amount * feePercent) / 10000;

        const updateData: any = {
          status: "Paid",
          paid_token,
          paid_network,
          paid_tx_hash,
          wallet_address,
          // On this path `wallet_address` IS the payer — the checkout sends the
          // connected wallet. On the deposit path the same column holds the
          // address Voulti generated. Writing the payer to its own column makes
          // the two flows agree instead of overloading one field with two
          // meanings depending on how the invoice happened to be paid.
          payer_address: wallet_address,
          paid_amount,
          fee_percent: feePercent,
          fee_amount: feeAmount,
          paid_at: new Date().toISOString()
        };
  
        // Update invoice payment data
        const { data: updatedInvoice, error: updateError } = await supabase
          .from("invoices")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
  
        if (updateError) {
          console.error("Error updating invoice payment data:", updateError);
          return res.status(500).send({
            error: "Failed to update invoice payment data"
          });
        }
  
        // Log the payment update for audit
        console.log(`Invoice ${id} payment data updated - Token: ${paid_token}, Network: ${paid_network}, TX: ${paid_tx_hash}, Wallet: ${wallet_address}, Amount: ${paid_amount}${reason ? ` - Reason: ${reason}` : ""}`);
  
        return res.send({
          success: true,
          data: {
            id: updatedInvoice.id,
            previousStatus: existingInvoice.status,
            newStatus: updatedInvoice.status,
            paid_token: updatedInvoice.paid_token,
            paid_network: updatedInvoice.paid_network,
            paid_tx_hash: updatedInvoice.paid_tx_hash,
            wallet_address: updatedInvoice.wallet_address,
            paid_amount: updatedInvoice.paid_amount,
            paid_at: updatedInvoice.paid_at,
            reason: reason || null
          },
          message: `Invoice payment data updated successfully`
        });
  
      } catch (error: any) {
        console.error("Error updating invoice payment data:", error);
        return res.status(500).send({
          error: error.message || "Failed to update invoice payment data"
        });
      }
    });

}



// Helper function to get token symbol
function getTokenSymbol(tokenAddress: string): string {
  const tokens = {
    "0xe6A57340f0df6E020c1c0a80bC6E13048601f0d4": "cCOP",
    "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1": "cUSD",
    "0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F": "cEUR",
    "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B": "USDC"
  };
  return tokens[tokenAddress as keyof typeof tokens] || "Unknown";
}

