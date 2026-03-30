// src/business/expireOrders.ts
import { createClient } from '@supabase/supabase-js';

interface Invoice {
  id: string;
  commerce_id: string;
  amount_fiat: number;
  fiat_currency: string;
  status: string;
  expires_at: string;
  created_at: string;
  expired_at?: string;
}

export class ExpireOrdersService {
  private supabase: any;

  constructor() {
    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async expirePendingOrders(): Promise<void> {
    try {
      console.log('🔄 Starting pending orders expiration process...');

      // 1. Get all pending invoices
      const pendingInvoices = await this.getPendingInvoices();
      
      if (pendingInvoices.length === 0) {
        console.log('ℹ️ No pending invoices found');
        return;
      }

      console.log(`📊 Found ${pendingInvoices.length} pending invoices`);

      // 2. Filter invoices that have expired
      const expiredInvoices = this.filterExpiredInvoices(pendingInvoices);
      
      if (expiredInvoices.length === 0) {
        console.log('ℹ️ No expired invoices found');
        return;
      }

      console.log(`⏰ Found ${expiredInvoices.length} expired invoices`);

      // 3. Update expired invoices in database
      await this.updateExpiredInvoices(expiredInvoices);

      console.log(`✅ Successfully expired ${expiredInvoices.length} invoices`);
      console.log('🎉 Orders expiration process completed successfully');

    } catch (error: any) {
      console.error('❌ Error expiring orders:', error.message);
      throw error;
    }
  }

  private async getPendingInvoices(): Promise<Invoice[]> {
    try {
      const { data: invoices, error } = await this.supabase
        .from('invoices')
        .select('id, commerce_id, amount_fiat, fiat_currency, status, expires_at, created_at, expired_at')
        .eq('status', 'Pending');

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return invoices || [];
    } catch (error: any) {
      console.error('❌ Error fetching pending invoices:', error.message);
      throw error;
    }
  }

  private filterExpiredInvoices(invoices: Invoice[]): Invoice[] {
    const currentTime = new Date();
    
    return invoices.filter(invoice => {
      const expirationTime = new Date(invoice.expires_at);
      return expirationTime <= currentTime;
    });
  }

  private async updateExpiredInvoices(expiredInvoices: Invoice[]): Promise<void> {
    try {
      console.log('💾 Updating expired invoices in database...');

      const currentTime = new Date().toISOString();

      for (const invoice of expiredInvoices) {
        const { error } = await this.supabase
          .from('invoices')
          .update({
            status: 'Expired',
            expired_at: currentTime
          })
          .eq('id', invoice.id);

        if (error) {
          console.error(`❌ Error updating invoice ${invoice.id}:`, error.message);
          throw new Error(`Failed to update invoice ${invoice.id}: ${error.message}`);
        }

        console.log(`✅ Expired invoice ${invoice.id} (${invoice.amount_fiat} ${invoice.fiat_currency})`);
      }

      console.log(`💾 Database update completed successfully. Expired ${expiredInvoices.length} invoices`);

    } catch (error: any) {
      console.error('❌ Error updating database:', error.message);
      throw error;
    }
  }
}
