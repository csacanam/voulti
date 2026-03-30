import { FastifyInstance } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import { NETWORKS } from '../blockchain/config/networks';
import { CONTRACTS } from '../blockchain/config/contracts';
import { TOKENS } from '../blockchain/config/tokens';
import { getWallet } from '../blockchain/utils/web3';
import AccessManagerABI from '../blockchain/abi/AccessManager.json';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

/**
 * Whitelist a commerce on all networks where contracts are deployed.
 * Uses the backend wallet with ONBOARDING_ROLE.
 */
async function whitelistCommerceOnChain(wallet: string): Promise<{ network: string; success: boolean; error?: string }[]> {
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) {
    throw new Error('BACKEND_PRIVATE_KEY not configured');
  }

  const results = [];

  for (const [networkName, contracts] of Object.entries(CONTRACTS)) {
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
      const tx1 = await accessManager.addCommerceToWhitelist(wallet);
      await tx1.wait();

      // Whitelist all tokens for this commerce on this network
      const networkTokens = TOKENS[networkName];
      if (networkTokens) {
        const tokenAddresses = Object.values(networkTokens).map(t => t.address);
        if (tokenAddresses.length > 0) {
          const tx2 = await accessManager.addTokenToCommerceWhitelist(wallet, tokenAddresses);
          await tx2.wait();
        }
      }

      results.push({ network: networkName, success: true });
    } catch (error: any) {
      console.error(`Whitelist error on ${networkName}:`, error.message);
      results.push({ network: networkName, success: false, error: error.message });
    }
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
          const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, {
            name: networkConfig.name,
            chainId: networkConfig.chainId,
          });
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

      // Whitelist on all chains (non-blocking)
      let chainResults: { network: string; success: boolean; error?: string }[] = [];
      try {
        chainResults = await whitelistCommerceOnChain(wallet.toLowerCase());
      } catch (err: any) {
        console.error('On-chain whitelist error:', err.message);
      }

      return res.status(201).send({
        success: true,
        data: {
          commerce_id: commerce.id,
          name: commerce.name,
          wallet: commerce.wallet,
          currency: commerce.currency,
          chains: chainResults,
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
          tokens_addresses (
            token_symbol,
            tokens (
              symbol,
              name
            )
          )
        `)
        .eq('commerce_id', id);

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
      }

      // Extract supported token symbols
      const supportedTokens = enabledTokens?.map((item: any) => 
        item.tokens_addresses?.tokens?.symbol
      ).filter(Boolean) || [];

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
              tokens_addresses (
                token_symbol,
                tokens (
                  symbol,
                  name
                )
              )
            `)
            .eq('commerce_id', commerce.id);

          const supportedTokens = enabledTokens?.map((item: any) => 
            item.tokens_addresses?.tokens?.symbol
          ).filter(Boolean) || [];

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