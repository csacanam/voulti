// src/cron/tokenPrices.ts
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface TokenPrice {
  symbol: string;
  price_usd: number;
  last_updated: string;
}

interface CoinGeckoResponse {
  [key: string]: {
    usd: number;
  };
}

interface DatabaseToken {
  symbol: string;
  name: string;
  rate_to_usd: number;
  updated_at: string;
  source: string;
  is_enabled: boolean;
}

export class TokenPriceService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private supabase: any;

  constructor() {
    this.apiKey = process.env.COINGECKO_APIKEY!;
    
    if (!this.apiKey) {
      throw new Error('COINGECKO_APIKEY environment variable is required');
    }

    // Inicializar Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async updateAllTokenPrices(): Promise<void> {
    try {
      console.log('🔄 Starting token price update process...');

      // 1. Obtener tokens habilitados de la base de datos
      const tokens = await this.getEnabledTokensFromDatabase();
      
      if (tokens.length === 0) {
        console.log('ℹ️ No enabled tokens found in database');
        return;
      }

      console.log(`📊 Found ${tokens.length} enabled tokens: ${tokens.map(t => t.symbol).join(', ')}`);

      // 2. Obtener precios de CoinGecko
      const prices = await this.fetchPricesFromCoinGecko(tokens);

      // 3. Actualizar precios en la base de datos
      await this.updateTokenPricesInDatabase(prices);

      console.log('✅ Token prices updated successfully');

    } catch (error: any) {
      console.error('❌ Error updating token prices:', error.message);
      throw error;
    }
  }

  private async getEnabledTokensFromDatabase(): Promise<DatabaseToken[]> {
    try {
      const { data: tokens, error } = await this.supabase
        .from('tokens')
        .select('symbol, name, rate_to_usd, updated_at, source, is_enabled')
        .eq('is_enabled', true);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return tokens || [];
    } catch (error: any) {
      console.error('❌ Error fetching tokens from database:', error.message);
      throw error;
    }
  }

  private async fetchPricesFromCoinGecko(tokens: DatabaseToken[]): Promise<TokenPrice[]> {
    try {
      // Convert symbols to CoinGecko format (lowercase)
      const symbols = tokens.map(token => token.symbol.toLowerCase()).join(',');
      
      console.log(`🔄 Fetching prices from CoinGecko for: ${symbols}`);

      const response = await axios.get<CoinGeckoResponse>(
        `${this.baseUrl}/simple/price`,
        {
          params: {
            vs_currencies: 'usd',
            symbols: symbols
          },
          headers: {
            'accept': 'application/json',
            'x-cg-demo-api-key': this.apiKey
          }
        }
      );

      // Map CoinGecko response to our tokens
      const tokenPrices: TokenPrice[] = tokens
        .filter(token => response.data[token.symbol.toLowerCase()])
        .map(token => ({
          symbol: token.symbol,
          price_usd: response.data[token.symbol.toLowerCase()].usd,
          last_updated: new Date().toISOString()
        }));

      console.log(`✅ Successfully fetched prices for ${tokenPrices.length} tokens`);
      return tokenPrices;

    } catch (error: any) {
      console.error('❌ Error fetching prices from CoinGecko:', error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded for CoinGecko API');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key for CoinGecko');
      }
      
      throw new Error(`Failed to fetch prices from CoinGecko: ${error.message}`);
    }
  }

  private async updateTokenPricesInDatabase(prices: TokenPrice[]): Promise<void> {
    try {
      console.log('💾 Updating token prices in database...');

      for (const price of prices) {
        const { error } = await this.supabase
          .from('tokens')
          .update({
            rate_to_usd: price.price_usd,
            source: 'coingecko.com',
            updated_at: new Date().toISOString()
          })
          .eq('symbol', price.symbol);

        if (error) {
          console.error(`❌ Error updating ${price.symbol}:`, error.message);
          throw new Error(`Failed to update ${price.symbol}: ${error.message}`);
        }

        console.log(`✅ Updated ${price.symbol}: $${price.price_usd}`);
      }

      console.log('💾 Database update completed successfully');

    } catch (error: any) {
      console.error('❌ Error updating database:', error.message);
      throw error;
    }
  }


  // Function for manual testing
  async testService(): Promise<void> {
    try {
      console.log('🧪 Testing TokenPriceService...');
      
      // Test 1: Get tokens from database
      console.log('📊 Test 1: Getting tokens from database...');
      const tokens = await this.getEnabledTokensFromDatabase();
      console.log(`✅ Found ${tokens.length} tokens:`, tokens.map(t => t.symbol));
      
      if (tokens.length > 0) {
        // Test 2: Get prices from CoinGecko
        console.log('🔄 Test 2: Fetching prices from CoinGecko...');
        const prices = await this.fetchPricesFromCoinGecko(tokens);
        console.log(`✅ Got prices for ${prices.length} tokens:`, prices);
        
        // Test 3: Simulate database update (without doing real update)
        console.log('💾 Test 3: Simulating database update...');
        console.log('✅ Database update simulation completed');
      }
      
      console.log('🎉 All tests completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
}
