// src/business/fiatRates.ts
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: {
    [currency: string]: number;
  };
}

interface DatabaseFiatRate {
  currency_code: string;
  usd_to_currency_rate: number;
  fetched_at: string;
  source: string;
}

export class FiatRateService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openexchangerates.org/api';
  private supabase: any;

  constructor() {
    this.apiKey = process.env.OPENEXCHANGERATE_APPID!;
    
    if (!this.apiKey) {
      throw new Error('OPENEXCHANGERATE_APPID environment variable is required');
    }

    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async updateAllFiatRates(): Promise<void> {
    try {
      console.log('🔄 Starting fiat rate update process...');

      // 1. Get supported fiat currencies from database
      const supportedCurrencies = await this.getSupportedFiatCurrencies();
      
      if (supportedCurrencies.length === 0) {
        console.log('ℹ️ No supported fiat currencies found in database');
        return;
      }

      console.log(`📊 Found ${supportedCurrencies.length} supported currencies: ${supportedCurrencies.map(c => c.currency_code).join(', ')}`);

      // 2. Get exchange rates from OpenExchangeRates
      const exchangeRates = await this.fetchFiatRatesFromAPI();

      // 3. Filter only supported currencies and update database
      await this.updateFiatRatesInDatabase(supportedCurrencies, exchangeRates);

      console.log('✅ Fiat rates updated successfully');

    } catch (error: any) {
      console.error('❌ Error updating fiat rates:', error.message);
      throw error;
    }
  }

  private async getSupportedFiatCurrencies(): Promise<DatabaseFiatRate[]> {
    try {
      const { data: currencies, error } = await this.supabase
        .from('fiat_exchange_rates')
        .select('currency_code, usd_to_currency_rate, fetched_at, source');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return currencies || [];
    } catch (error: any) {
      console.error('❌ Error fetching fiat currencies from database:', error.message);
      throw error;
    }
  }

  private async fetchFiatRatesFromAPI(): Promise<OpenExchangeRatesResponse> {
    try {
      console.log('🔄 Fetching fiat rates from OpenExchangeRates...');

      const response = await axios.get<OpenExchangeRatesResponse>(
        `${this.baseUrl}/latest.json`,
        {
          params: {
            app_id: this.apiKey
          },
          headers: {
            'accept': 'application/json'
          }
        }
      );

      console.log(`✅ Successfully fetched rates for ${Object.keys(response.data.rates).length} currencies`);
      return response.data;

    } catch (error: any) {
      console.error('❌ Error fetching fiat rates from OpenExchangeRates:', error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key for OpenExchangeRates');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded for OpenExchangeRates API');
      }
      
      throw new Error(`Failed to fetch fiat rates from OpenExchangeRates: ${error.message}`);
    }
  }

  private async updateFiatRatesInDatabase(
    supportedCurrencies: DatabaseFiatRate[], 
    exchangeRates: OpenExchangeRatesResponse
  ): Promise<void> {
    try {
      console.log('💾 Updating fiat rates in database...');

      let updatedCount = 0;

      for (const currency of supportedCurrencies) {
        const currencyCode = currency.currency_code;
        
        // Check if currency is available in API response
        if (exchangeRates.rates[currencyCode]) {
          const newRate = exchangeRates.rates[currencyCode];
          
          const { error } = await this.supabase
            .from('fiat_exchange_rates')
            .update({
              usd_to_currency_rate: newRate,
              source: 'https://openexchangerates.org/',
              fetched_at: new Date().toISOString()
            })
            .eq('currency_code', currencyCode);

          if (error) {
            console.error(`❌ Error updating ${currencyCode}:`, error.message);
            throw new Error(`Failed to update ${currencyCode}: ${error.message}`);
          }

          console.log(`✅ Updated ${currencyCode}: 1 USD = ${newRate} ${currencyCode}`);
          updatedCount++;
        } else {
          console.log(`⚠️ Currency ${currencyCode} not found in API response, skipping...`);
        }
      }

      console.log(`💾 Database update completed successfully. Updated ${updatedCount} currencies`);

    } catch (error: any) {
      console.error('❌ Error updating database:', error.message);
      throw error;
    }
  }
}
