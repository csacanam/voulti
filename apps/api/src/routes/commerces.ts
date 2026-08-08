import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { NETWORKS } from '../blockchain/config/networks';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';
import { getProvider, getWallet } from '../blockchain/utils/web3';
import AccessManagerABI from '../blockchain/abi/AccessManager.json';
import DerampProxyABI from '../blockchain/abi/DerampProxy.json';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getCommerceNetworkStatus, enableCommerceOnNetwork, disableCommerceOnNetwork } from '../business/commerceNetworks';
import { sendTelegramAlert } from '../utils/notify';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

/**
 * Whitelist a commerce on all networks where contracts are deployed.
 * Uses the backend wallet with ONBOARDING_ROLE.
 */
export async function whitelistCommerceOnChain(
  wallet: string,
  /**
   * Restrict to these networks. Signup passes nothing (a new commerce needs
   * all of them); the repair route passes only what is actually missing, so
   * re-running it does not re-send ~170 transactions worth of gas to set flags
   * that are already true.
   */
  onlyNetworks?: string[]
): Promise<{ network: string; success: boolean; error?: string }[]> {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) {
    throw new Error('BACKEND_PRIVATE_KEY not configured');
  }

  const results = [];

  /**
   * The operator wallet is shared: SweepService funds deposit gas from it every
   * fifteen seconds, so a whitelist transaction can pick the same nonce as one
   * of those and lose the race — "replacement fee too low" / "nonce too low".
   * Nothing is wrong when that happens; the next attempt gets a fresh nonce.
   */
  const sendWithNonceRetry = async (
    label: string,
    send: () => Promise<any>
  ): Promise<void> => {
    const NONCE_CLASH = /replacement fee too low|nonce too low|already known|NONCE_EXPIRED/i;

    for (let attempt = 1; ; attempt++) {
      try {
        const tx = await send();
        await tx.wait();
        return;
      } catch (err: any) {
        const msg = err?.message || '';
        if (attempt >= 4 || !NONCE_CLASH.test(msg)) throw err;

        console.warn(`[whitelist] ${label}: nonce clash, retry ${attempt}/3`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  };

  for (const [networkName, contracts] of Object.entries(CONTRACTS)) {
    if (onlyNetworks && !onlyNetworks.includes(networkName)) continue;

    if (!contracts.ACCESS_MANAGER) {
      results.push({ network: networkName, success: false, error: 'No contract deployed' });
      continue;
    }

    try {
      const signer = getWallet(backendKey, networkName as keyof typeof NETWORKS, false);
      const accessManager = new ethers.Contract(
        contracts.ACCESS_MANAGER,
        AccessManagerABI.abi || AccessManagerABI,
        signer
      );

      // Whitelist the commerce
      await sendWithNonceRetry(`${networkName}/commerce`, () =>
        accessManager.addCommerceToWhitelist(wallet)
      );

      // Whitelist all tokens for this commerce on this network
      const networkTokens = TOKENS[networkName];
      if (networkTokens) {
        const tokenAddresses = Object.values(networkTokens).map(t => t.address);
        if (tokenAddresses.length > 0) {
          await sendWithNonceRetry(`${networkName}/tokens`, () =>
            accessManager.addTokenToCommerceWhitelist(wallet, tokenAddresses)
          );
        }
      }

      results.push({ network: networkName, success: true });
    } catch (error: any) {
      console.error(`Whitelist error on ${networkName}:`, error.message);
      results.push({ network: networkName, success: false, error: error.message });
    }
  }

  // This runs detached from the signup response, so a failure here used to
  // leave a merchant permanently unable to take payments on a network with
  // nothing but a log line to show for it — which is exactly how commerces
  // ended up missing Polygon without anyone noticing.
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    const esc = (s: unknown) =>
      String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    await sendTelegramAlert(
      `whitelist_failed_${wallet}`,
      [
        '⚠️ <b>Whitelist on-chain incompleto</b>',
        '',
        `<b>Wallet:</b> <code>${esc(wallet)}</code>`,
        `<b>Redes OK:</b> ${results.filter(r => r.success).map(r => r.network).join(', ') || '(ninguna)'}`,
        `<b>Redes fallidas:</b> ${failed.map(r => r.network).join(', ')}`,
        '',
        ...failed.map(r => `<code>${esc(r.network)}: ${esc(r.error).slice(0, 160)}</code>`),
        '',
        `Reintentar: <code>POST /admin/commerces/${esc(wallet)}/whitelist</code>`,
      ].join('\n')
    );
  }

  return results;
}

export async function commercesRoutes(app: FastifyInstance) {
  
  // Get payouts/withdrawals for a specific commerce (authenticated + ownership)
  app.get('/:id/payouts', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        return res.status(400).send({ error: 'Commerce ID is required' });
      }

      // Verify ownership
      const { data: commerceCheck } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerceCheck || commerceCheck.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const { data: payouts, error: payoutsError } = await supabase
        .from('payouts')
        .select('id, to_amount, to_currency, to_name, to_email, to_address, status, created_at, claimed_at')
        .eq('commerce_id', id)
        .order('created_at', { ascending: false });

      if (payoutsError) {
        console.error('Error fetching commerce payouts:', payoutsError);
        return res.status(500).send({ error: 'Failed to fetch payouts' });
      }

      return res.send({ payouts: payouts || [] });
    } catch (error: any) {
      console.error('Get commerce payouts error:', error);
      return res.status(500).send({ error: error.message || 'Failed to get commerce payouts' });
    }
  });

  // Get commerce balances across all chains (authenticated + ownership)
  app.get('/:id/balances', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };

      const { data: commerce, error } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (error || !commerce) {
        return res.status(404).send({ error: 'Commerce not found' });
      }

      // Verify ownership
      if (commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const wallet = commerce.wallet;
      const storageAbi = ['function balances(address commerce, address token) view returns (uint256)'];
      const balances: { network: string; chainId: number; symbol: string; balance: string; decimals: number; tokenAddress: string }[] = [];

      const promises = Object.entries(CONTRACTS).map(async ([networkName, contracts]) => {
        if (!contracts.DERAMP_STORAGE) return;

        const networkTokens = TOKENS[networkName];
        if (!networkTokens) return;

        try {
          const networkConfig = NETWORKS[networkName as keyof typeof NETWORKS];
          const provider = getProvider(networkName);
          const storage = new ethers.Contract(contracts.DERAMP_STORAGE, storageAbi, provider);

          for (const [, token] of Object.entries(networkTokens)) {
            try {
              const raw = await storage.balances(wallet, token.address);
              const formatted = ethers.formatUnits(raw, token.decimals);
              balances.push({
                network: networkName,
                chainId: networkConfig.chainId,
                symbol: token.symbol,
                balance: formatted,
                decimals: token.decimals,
                tokenAddress: token.address,
              });
            } catch {
              balances.push({
                network: networkName,
                chainId: networkConfig.chainId,
                symbol: token.symbol,
                balance: '0',
                decimals: token.decimals,
                tokenAddress: token.address,
              });
            }
          }
        } catch (err: any) {
          console.error(`Balance read error on ${networkName}:`, err.message);
        }
      });

      await Promise.all(promises);

      return res.send({ success: true, data: balances });
    } catch (error: any) {
      console.error('Get balances error:', error);
      return res.status(500).send({ error: error.message || 'Failed to get balances' });
    }
  });

  // Update webhook URL (authenticated + verify ownership)
  app.put('/:id/webhook', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };
      const { confirmation_url } = req.body as { confirmation_url: string | null };

      // Verify ownership
      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce || commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const { error } = await supabase
        .from('commerces')
        .update({ confirmation_url: confirmation_url || null })
        .eq('id', id);

      if (error) {
        return res.status(500).send({ error: 'Failed to update webhook URL' });
      }

      return res.send({ success: true });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to update' });
    }
  });

  // Get webhook signing secret (authenticated + verify ownership)
  app.get('/:id/webhook-secret', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };

      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet, webhook_secret')
        .eq('id', id)
        .single();

      if (!commerce || commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      return res.send({ webhook_secret: commerce.webhook_secret ?? null });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to fetch webhook secret' });
    }
  });

  // Get withdrawal fee estimate for a token
  app.get('/withdraw-fee/:tokenSymbol', async (req, res) => {
    try {
      const { tokenSymbol } = req.params as { tokenSymbol: string };

      const { data: tokenRate } = await supabase
        .from('tokens')
        .select('rate_to_usd')
        .eq('symbol', tokenSymbol)
        .single();

      const rateToUsd = tokenRate?.rate_to_usd || 1;
      const feeUsd = 1;
      const feeInToken = feeUsd / rateToUsd;

      return res.send({
        success: true,
        data: {
          fee_usd: feeUsd,
          fee_token: feeInToken,
          token_symbol: tokenSymbol,
          rate_to_usd: rateToUsd,
        }
      });
    } catch (error: any) {
      return res.status(500).send({ error: error.message || 'Failed to get fee estimate' });
    }
  });

  // Get commerce network/token whitelist status (authenticated + ownership)
  app.get('/:id/networks', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };

      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce) return res.status(404).send({ error: 'Commerce not found' });
      if (commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const networks = await getCommerceNetworkStatus(commerce.wallet);
      return res.send({ success: true, data: networks });
    } catch (error: any) {
      console.error('Get networks error:', error);
      return res.status(500).send({ error: error.message || 'Failed to get networks' });
    }
  });

  // Enable a network for a commerce (whitelist commerce + tokens)
  app.post('/:id/networks/:network/enable', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, network } = req.params as { id: string; network: string };

      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce) return res.status(404).send({ error: 'Commerce not found' });
      if (commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const txHash = await enableCommerceOnNetwork(commerce.wallet, network);
      return res.send({ success: true, data: { tx_hash: txHash, network } });
    } catch (error: any) {
      console.error('Enable network error:', error);
      return res.status(500).send({ error: error.message || 'Failed to enable network' });
    }
  });

  // Disable a network for a commerce
  app.post('/:id/networks/:network/disable', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id, network } = req.params as { id: string; network: string };

      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce) return res.status(404).send({ error: 'Commerce not found' });
      if (commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const txHash = await disableCommerceOnNetwork(commerce.wallet, network);
      return res.send({ success: true, data: { tx_hash: txHash, network } });
    } catch (error: any) {
      console.error('Disable network error:', error);
      return res.status(500).send({ error: error.message || 'Failed to disable network' });
    }
  });

  // Gasless withdraw: backend executes withdrawFor on behalf of commerce
  /**
   * Send a merchant just enough native token to pay for their own withdrawal.
   *
   * The gasless path exists for wallets with no gas, and it charges a flat $1
   * — which on a small balance is most of the payout, and is wildly more than
   * the transaction actually costs. Funding the gas instead costs cents and
   * lets the merchant withdraw the full amount themselves.
   *
   * Only for a wallet that has something to withdraw on that network, so this
   * cannot be used to drain the operator by asking repeatedly.
   */
  app.post('/:id/gas-topup', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };
      const { network, token_address } = req.body as { network: string; token_address: string };

      if (!network || !token_address) {
        return res.status(400).send({ error: 'network and token_address are required' });
      }

      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce || commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const contracts = CONTRACTS[network];
      if (!contracts?.DERAMP_STORAGE) {
        return res.status(400).send({ error: `Network ${network} not supported` });
      }

      const provider = getProvider(network);

      // Refuse unless there is actually a payout waiting: no balance, no reason
      // to hand out gas.
      const storage = new ethers.Contract(
        contracts.DERAMP_STORAGE,
        ['function balances(address,address) view returns (uint256)'],
        provider
      );
      const withdrawable: bigint = await storage.balances(commerce.wallet, token_address);
      if (withdrawable === 0n) {
        return res.status(400).send({ error: 'Nothing to withdraw on this network' });
      }

      const feeData = await provider.getFeeData();
      const pricePerGas =
        feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
      // A withdraw through the proxy lands well under this; the margin covers a
      // base-fee move between this quote and the merchant actually clicking.
      const needed = 300_000n * pricePerGas * 2n;

      const current = await provider.getBalance(commerce.wallet);
      if (current >= needed) {
        return res.send({
          success: true,
          data: { funded: false, reason: 'Wallet already has enough gas' },
        });
      }

      const backendKey = process.env.BACKEND_PRIVATE_KEY;
      if (!backendKey) {
        return res.status(500).send({ error: 'Backend wallet not configured' });
      }

      const operator = getWallet(backendKey, network, false);
      const tx = await operator.sendTransaction({
        to: commerce.wallet,
        value: needed - current,
      });
      await tx.wait();

      console.log(`[gas-topup] ${ethers.formatEther(needed - current)} to ${commerce.wallet} on ${network}: ${tx.hash}`);

      return res.send({
        success: true,
        data: { funded: true, tx_hash: tx.hash, amount: ethers.formatEther(needed - current) },
      });
    } catch (error: any) {
      console.error('Gas top-up error:', error);
      return res.status(500).send({ error: error.message || 'Gas top-up failed' });
    }
  });

  app.post('/:id/withdraw-for', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params as { id: string };
      const { token_address, amount, network, to } = req.body as {
        token_address: string;
        amount: string; // human-readable amount (e.g. "100")
        network: string; // e.g. "celo", "arbitrum"
        to: string; // recipient address
      };

      if (!token_address || !amount || !network || !to) {
        return res.status(400).send({ error: 'token_address, amount, network, and to are required' });
      }

      if (!ethers.isAddress(to)) {
        return res.status(400).send({ error: 'Invalid recipient address' });
      }

      // Verify ownership
      const { data: commerce } = await supabase
        .from('commerces')
        .select('wallet')
        .eq('id', id)
        .single();

      if (!commerce || commerce.wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      const contracts = CONTRACTS[network];
      if (!contracts) {
        return res.status(400).send({ error: `Network ${network} not supported` });
      }

      // Find token info to get decimals and rate
      const networkTokens = TOKENS[network];
      if (!networkTokens) {
        return res.status(400).send({ error: `No tokens configured for ${network}` });
      }

      const tokenInfo = Object.values(networkTokens).find(
        t => t.address.toLowerCase() === token_address.toLowerCase()
      );
      if (!tokenInfo) {
        return res.status(400).send({ error: 'Token not found on this network' });
      }

      // Get token rate to calculate $1 USD fee
      const { data: tokenRate } = await supabase
        .from('tokens')
        .select('rate_to_usd')
        .eq('symbol', tokenInfo.symbol)
        .single();

      const rateToUsd = tokenRate?.rate_to_usd || 1;
      const feeUsd = 1; // $1 USD flat fee
      const feeInToken = feeUsd / rateToUsd;

      const amountParsed = ethers.parseUnits(amount, tokenInfo.decimals);
      const feeParsed = ethers.parseUnits(feeInToken.toFixed(tokenInfo.decimals), tokenInfo.decimals);

      if (feeParsed >= amountParsed) {
        return res.status(400).send({ error: 'Amount too small to cover the withdrawal fee' });
      }

      // Execute withdrawFor via backend wallet
      const backendKey = process.env.BACKEND_PRIVATE_KEY;
      if (!backendKey) {
        return res.status(500).send({ error: 'Backend wallet not configured' });
      }

      const signer = getWallet(backendKey, network, false);
      const proxyContract = new ethers.Contract(
        contracts.DERAMP_PROXY,
        DerampProxyABI.abi || DerampProxyABI,
        signer
      );

      const tx = await proxyContract.withdrawFor(
        commerce.wallet,
        token_address,
        amountParsed,
        feeParsed,
        to
      );
      await tx.wait();

      const netAmount = ethers.formatUnits(amountParsed - feeParsed, tokenInfo.decimals);

      // Record withdrawal in payouts table
      await supabase.from('payouts').insert({
        commerce_id: id,
        to_address: to,
        to_name: to.slice(0, 6) + '...' + to.slice(-4),
        to_amount: parseFloat(netAmount),
        to_currency: tokenInfo.symbol,
        status: 'Claimed',
        claimed_at: new Date().toISOString(),
      });

      return res.send({
        success: true,
        data: {
          tx_hash: tx.hash,
          network,
          token: tokenInfo.symbol,
          amount_withdrawn: amount,
          fee: ethers.formatUnits(feeParsed, tokenInfo.decimals),
          net_amount: netAmount,
        }
      });
    } catch (error: any) {
      console.error('WithdrawFor error:', error);
      return res.status(500).send({ error: error.message || 'Failed to execute withdrawal' });
    }
  });

  // Get commerce by wallet address (authenticated + verify own wallet)
  app.get('/by-wallet/:wallet', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      const { wallet } = req.params as { wallet: string };

      if (!wallet) {
        return res.status(400).send({
          error: 'Wallet address is required'
        });
      }

      // Verify the requested wallet matches the authenticated user's wallet
      if (wallet.toLowerCase() !== req.walletAddress) {
        return res.status(403).send({ error: 'Not authorized' });
      }

      // Get commerce by wallet (case insensitive)
      const { data: commerce, error } = await supabase
        .from('commerces')
        .select('*')
        .ilike('wallet', wallet)
        .single();

      if (error || !commerce) {
        return res.status(404).send({
          error: 'Commerce not found for this wallet'
        });
      }

      return res.send({
        success: true,
        data: {
          commerce_id: commerce.id,
          name: commerce.name,
          wallet: commerce.wallet,
          spread: commerce.spread,
          currency: commerce.currency,
          currencySymbol: commerce.currencySymbol,
          description_spanish: commerce.description_spanish,
          description_english: commerce.description_english,
          minAmount: commerce.minAmount,
          maxAmount: commerce.maxAmount,
          icon_url: commerce.icon_url,
          confirmation_url: commerce.confirmation_url,
          confirmation_email: commerce.confirmation_email,
          created_at: commerce.created_at
        }
      });

    } catch (error: any) {
      console.error('Get commerce by wallet error:', error);
      return res.status(500).send({
        error: error.message || 'Failed to get commerce'
      });
    }
  });

  // Register/Create new commerce (authenticated — wallet from token)
  app.post('/', { preHandler: requireAuth }, async (req: AuthenticatedRequest, res) => {
    try {
      // Use wallet from auth token, not from body (prevents spoofing)
      const wallet = req.walletAddress;
      if (!wallet) {
        return res.status(401).send({ error: 'Wallet not found in token' });
      }

      const { name, currency } = req.body as {
        name: string;
        currency: string;
      };

      if (!name) {
        return res.status(400).send({
          error: 'Missing required field: name'
        });
      }

      // Check if commerce already exists
      const { data: existing } = await supabase
        .from('commerces')
        .select('id')
        .ilike('wallet', wallet)
        .single();

      if (existing) {
        return res.status(409).send({
          error: 'Commerce already exists for this wallet'
        });
      }

      // Create in database
      const { data: commerce, error } = await supabase
        .from('commerces')
        .insert({
          wallet: wallet.toLowerCase(),
          name,
          currency: currency || 'USD',
          confirmation_email: (req as any).userEmail || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Create commerce error:', error);
        return res.status(500).send({ error: 'Failed to create commerce' });
      }

      // Enable all available tokens for this commerce
      try {
        const { data: allTokenAddresses } = await supabase
          .from('tokens_addresses')
          .select('id')
          .eq('is_active', true);

        if (allTokenAddresses && allTokenAddresses.length > 0) {
          const tokenRows = allTokenAddresses.map((ta: any) => ({
            commerce_id: commerce.id,
            token_id: ta.id,
          }));
          await supabase.from('tokens_enabled').insert(tokenRows);
        }
      } catch (err: any) {
        console.error('Token enable error:', err.message);
      }

      // Whitelist on all chains in background (don't block the response)
      whitelistCommerceOnChain(wallet.toLowerCase()).catch((err: any) => {
        console.error('On-chain whitelist error:', err.message);
      });

      return res.status(201).send({
        success: true,
        data: {
          commerce_id: commerce.id,
          name: commerce.name,
          wallet: commerce.wallet,
          currency: commerce.currency,
        }
      });

    } catch (error: any) {
      console.error('Register commerce error:', error);
      return res.status(500).send({
        error: error.message || 'Failed to register commerce'
      });
    }
  });

  // Get commerce by ID
  app.get('/:id', async (req, res) => {
    try {
      const { id } = req.params as { id: string };

      // Validate ID format (UUID)
      if (!id || typeof id !== 'string') {
        return res.status(400).send({ 
          error: 'Invalid commerce ID' 
        });
      }

      // Get commerce information from database with all fields
      const { data: commerce, error } = await supabase
        .from('commerces')
        .select(`
          id,
          name,
          icon_url,
          currency,
          currencySymbol,
          description_spanish,
          description_english,
          minAmount,
          maxAmount
        `)
        .eq('id', id)
        .single();

      if (error || !commerce) {
        return res.status(404).send({ 
          error: 'Commerce not found' 
        });
      }

      // Get supported tokens for this commerce
      const { data: enabledTokens, error: tokensError } = await supabase
        .from('tokens_enabled')
        .select(`
          tokens_addresses!inner (
            token_symbol,
            is_active,
            tokens (
              symbol,
              name
            )
          )
        `)
        .eq('commerce_id', id)
        // Retired tokens must disappear here too, or this endpoint keeps
        // advertising something no invoice will ever offer.
        .eq('tokens_addresses.is_active', true);

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
      }

      // Extract supported token symbols
      const supportedTokens = [...new Set(
        enabledTokens?.map((item: any) => item.tokens_addresses?.tokens?.symbol).filter(Boolean) || []
      )] as string[]; // una fila por (token, red): el mismo simbolo se repite

      // Build response with all commerce information
      const response = {
        id: commerce.id,
        name: commerce.name,
        description_spanish: commerce.description_spanish,
        description_english: commerce.description_english,
        icon_url: commerce.icon_url,
        currency: commerce.currency,
        currency_symbol: commerce.currencySymbol,
        supported_tokens: supportedTokens,
        min_amount: commerce.minAmount,
        max_amount: commerce.maxAmount
      };

      return res.send({
        success: true,
        data: response
      });

    } catch (error: any) {
      console.error('Commerce error:', error);
      return res.status(500).send({
        error: error.message || 'Failed to get commerce information'
      });
    }
  });

  // Get all commerces (optional - for listing)
  app.get('/', async (req, res) => {
    try {
      const { data: commerces, error } = await supabase
        .from('commerces')
        .select(`
          id,
          name,
          icon_url,
          currency,
          currencySymbol,
          description_spanish,
          description_english,
          minAmount,
          maxAmount
        `)
        .order('name');

      if (error) {
        return res.status(500).send({ 
          error: 'Failed to fetch commerces' 
        });
      }

      // For each commerce, get supported tokens
      const commercesWithTokens = await Promise.all(
        (commerces || []).map(async (commerce) => {
          const { data: enabledTokens } = await supabase
            .from('tokens_enabled')
            .select(`
              tokens_addresses!inner (
                token_symbol,
                is_active,
                tokens (
                  symbol,
                  name
                )
              )
            `)
            .eq('commerce_id', commerce.id)
            .eq('tokens_addresses.is_active', true);

          const supportedTokens = [...new Set(
            enabledTokens?.map((item: any) => item.tokens_addresses?.tokens?.symbol).filter(Boolean) || []
          )] as string[]; // una fila por (token, red): el mismo simbolo se repite

          return {
            id: commerce.id,
            name: commerce.name,
            description_spanish: commerce.description_spanish,
            description_english: commerce.description_english,
            icon_url: commerce.icon_url,
            currency: commerce.currency,
            currency_symbol: commerce.currencySymbol,
            supported_tokens: supportedTokens,
            min_amount: commerce.minAmount,
            max_amount: commerce.maxAmount
          };
        })
      );

      return res.send({
        success: true,
        data: commercesWithTokens
      });

    } catch (error: any) {
      console.error('Commerce list error:', error);
      return res.status(500).send({
        error: error.message || 'Failed to get commerces list'
      });
    }
  });
} 