import { deliverWebhook, buildPayload, DeliveryResult } from './webhookDelivery';
import { createClient } from '@supabase/supabase-js';
import { InvoiceService } from '../blockchain/services/InvoiceServices';
import { getNetworkByChainId, NETWORKS } from '../blockchain/config/networks';
import { TOKENS } from '../blockchain/config/tokens';
import { getBlockExplorerUrl, getTokenSymbol, getNetworkDisplayName, getTokenAddress } from '../blockchain/utils/formatters';
import { sendTelegramAlert } from '../utils/notify';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const resend = new Resend(process.env.RESEND_APIKEY!);

interface InvoiceData {
  id: string;
  commerce_id: string;
  amount_fiat: number;
  fiat_currency: string;
  status: string;
  selected_network?: number;
  blockchain_invoice_id?: string;
  confirmation_url_available: boolean;
  confirmation_email_available: boolean;
  confirmation_email_sent: boolean;
  confirmation_url_response: boolean;
  confirmation_url_retries: number;
  paid_at?: string;
  paid_tx_hash?: string;
  paid_token?: string;
  paid_network?: string;
  paid_amount?: number;
  reference?: string | null;
  description?: string | null;
}

interface CommerceData {
  id: string;
  name: string;
  confirmation_url: string | null;
  confirmation_email?: string;
  webhook_secret?: string | null;
}

export class NotificationService {
  private maxRetries = 5;
  private batchSize = 10;           // Process max 10 invoices per execution (URLs)
  private emailBatchSize = 20;      // Process max 20 invoices per execution (Emails)
  private urlTimeout = 2000;        // 2 seconds timeout per URL

  /**
   * Process all invoices that need email notifications (called by external worker)
   * Processes in batches to respect cron timeout limits
   */
  async processAllPendingEmails(): Promise<void> {
    try {
      console.log('📧 Starting batch email notification processing...');
      
      // Query invoices that need email notifications
      const emailPendingInvoices = await this.getInvoicesNeedingEmailNotification();
      console.log(`📧 Found ${emailPendingInvoices.length} invoices needing email notifications`);
      
      // Process only the first batch to respect cron timeout
      const batch = emailPendingInvoices.slice(0, this.emailBatchSize);
      console.log(`📧 Processing batch of ${batch.length} emails (max ${this.emailBatchSize})`);
      
      // Process batch in parallel for maximum efficiency
      const promises = batch.map(async (invoice: InvoiceData) => {
        try {
          // Get commerce data
          const commerce = await this.getCommerceData(invoice.commerce_id);
          if (!commerce) {
            console.error(`Commerce ${invoice.commerce_id} not found`);
            return;
          }

          // For Expired invoices, skip blockchain verification since they don't need it
          if (invoice.status === 'Expired') {
            console.log(`Invoice ${invoice.id} is expired, skipping blockchain verification`);
          } else {
            // Verify blockchain status matches database status for Paid/Refunded invoices
            const isConfirmedOnBlockchain = await this.verifyBlockchainStatus(invoice);
            if (!isConfirmedOnBlockchain) {
              console.log(`Invoice ${invoice.id} not yet confirmed on blockchain, skipping email`);
              return;
            }
          }

          // Send email based on status and mark as sent
          await this.sendStatusEmail(invoice, commerce);
          await this.updateInvoiceField(invoice.id, 'confirmation_email_sent', true);
          
          console.log(`✅ Processed email notification for invoice ${invoice.id}`);
        } catch (error) {
          console.error(`❌ Failed to process email notification for invoice ${invoice.id}:`, error);
        }
      });
      
      // Wait for all batch items to complete
      await Promise.all(promises);
      
      console.log(`✨ Email notification processing completed. Processed ${batch.length}/${emailPendingInvoices.length} emails`);
      if (emailPendingInvoices.length > this.emailBatchSize) {
        console.log(`📋 ${emailPendingInvoices.length - this.emailBatchSize} emails remaining for next execution`);
      }
      
    } catch (error) {
      console.error('💥 Error in batch email notification processing:', error);
      throw error;
    }
  }

  /**
   * Process all invoices that need URL confirmations (called by external worker)
   * Processes in batches to respect cron timeout limits
   */
  async processAllPendingUrlConfirmations(): Promise<void> {
    try {
      console.log('🔗 Starting batch URL confirmation processing...');
      
      // Query invoices that need URL confirmations
      const urlPendingInvoices = await this.getInvoicesNeedingUrlConfirmation();
      console.log(`🔗 Found ${urlPendingInvoices.length} invoices needing URL confirmations`);
      
      // Process only the first batch to respect cron timeout
      const batch = urlPendingInvoices.slice(0, this.batchSize);
      console.log(`🔗 Processing batch of ${batch.length} invoices (max ${this.batchSize})`);
      
      // Process batch in parallel for maximum efficiency
      const promises = batch.map(async (invoice: InvoiceData) => {
        try {
          // Get commerce data
          const commerce = await this.getCommerceData(invoice.commerce_id);
          if (!commerce) {
            console.error(`Commerce ${invoice.commerce_id} not found`);
            return;
          }

          // Only `Paid` makes a claim the chain can contradict, and telling a
          // merchant to release goods demands that proof. `Expired` and
          // `Refunded` say the opposite — no money — and usually have no
          // on-chain record at all: an invoice refunded before it ever settled
          // was never created on-chain, so blockchain_invoice_id is null and
          // this gate would reject it forever. Gating them meant the merchant
          // was never told the payment came back.
          if (invoice.status === 'Paid') {
            const isConfirmedOnBlockchain = await this.verifyBlockchainStatus(invoice);
            if (!isConfirmedOnBlockchain) {
              console.log(`Invoice ${invoice.id} not yet confirmed on blockchain, skipping URL confirmation`);
              return;
            }
          }

          // Process URL confirmation
          await this.handleConfirmationUrl(invoice, commerce);
          
          console.log(`✅ Processed URL confirmation for invoice ${invoice.id}`);
        } catch (error) {
          console.error(`❌ Failed to process URL confirmation for invoice ${invoice.id}:`, error);
        }
      });
      
      // Wait for all batch items to complete
      await Promise.all(promises);
      
      console.log(`✨ URL confirmation processing completed. Processed ${batch.length}/${urlPendingInvoices.length} invoices`);
      if (urlPendingInvoices.length > this.batchSize) {
        console.log(`📋 ${urlPendingInvoices.length - this.batchSize} invoices remaining for next execution`);
      }
      
    } catch (error) {
      console.error('💥 Error in batch URL confirmation processing:', error);
      throw error;
    }
  }

  /**
   * Verify that backend invoice status matches blockchain status
   */
  private async verifyBlockchainStatus(invoice: InvoiceData): Promise<boolean> {
    if (!invoice.selected_network || !invoice.blockchain_invoice_id) {
      console.log(`Invoice ${invoice.id} not yet created on blockchain`);
      return false;
    }

    try {
      // Get network name from chainId
      const networkName = getNetworkByChainId(invoice.selected_network);
      
      // Create invoice service
      const invoiceService = new InvoiceService(networkName, false);
      await invoiceService.init(process.env.PRIVATE_KEY!);

      // Check status on blockchain
      const blockchainStatus = await invoiceService.getInvoiceStatus(invoice.blockchain_invoice_id);
      
      if (!blockchainStatus.exists) {
        console.log(`Invoice ${invoice.id} not found on blockchain`);
        return false;
      }

      // Map blockchain status to backend status for comparison
      const blockchainStatusMapped = this.mapBlockchainStatusToBackendStatus(blockchainStatus.status);
      
      // Compare backend status with blockchain status
      const statusMatch = invoice.status === blockchainStatusMapped;
      
      if (!statusMatch) {
        console.log(`Invoice ${invoice.id} status mismatch: Backend=${invoice.status}, Blockchain=${blockchainStatus.status} (mapped to ${blockchainStatusMapped})`);
        return false;
      }

      console.log(`Invoice ${invoice.id} status verified: Backend=${invoice.status}, Blockchain=${blockchainStatus.status}`);
      return true;
      
    } catch (error) {
      console.error(`Error verifying blockchain status for invoice ${invoice.id}:`, error);
      return false;
    }
  }

  /**
   * Map blockchain status to backend status for comparison
   */
  private mapBlockchainStatusToBackendStatus(blockchainStatus: string): string {
    switch (blockchainStatus.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'expired':
        return 'Expired';
      case 'refunded':
        return 'Refunded';
      case 'cancelled':
        return 'Cancelled';
      default:
        console.warn(`Unknown blockchain status: ${blockchainStatus}`);
        return blockchainStatus; // Return as-is for unknown statuses
    }
  }

  /**
   * Handle confirmation URL webhook
   */
  private async handleConfirmationUrl(invoice: InvoiceData, commerce: CommerceData): Promise<void> {

    try {
      const result = await this.sendToConfirmationUrl(invoice, commerce);

      if (result.ok) {
        // Update successful response
        await this.updateInvoiceField(invoice.id, 'confirmation_url_response', true);
        console.log(`Confirmation URL successful for invoice ${invoice.id}`);
      } else {
        // Increment retry count
        const newRetryCount = invoice.confirmation_url_retries + 1;
        await this.updateInvoiceField(invoice.id, 'confirmation_url_retries', newRetryCount);

        // The merchant is the one who has to fix this, so they get the status
        // code and the response body, not a generic sentence.
        const detail = this.describeDelivery(result);
        await this.sendConfirmationUrlFailureEmail(invoice, commerce, newRetryCount, detail);
        await this.alertIfRetriesExhausted(invoice, commerce, newRetryCount, detail);

        console.log(`Confirmation URL failed for invoice ${invoice.id}, retry ${newRetryCount}/${this.maxRetries}: ${detail}`);
      }
          } catch (error) {
        console.error(`Error handling confirmation URL for invoice ${invoice.id}:`, error);

        // Increment retry count on error
        const newRetryCount = invoice.confirmation_url_retries + 1;
        await this.updateInvoiceField(invoice.id, 'confirmation_url_retries', newRetryCount);

        // Send failure notification email to commerce
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await this.sendConfirmationUrlFailureEmail(invoice, commerce, newRetryCount, errorMessage);
        await this.alertIfRetriesExhausted(invoice, commerce, newRetryCount, errorMessage);
      }
  }

  /**
   * Alert us — not just the merchant — when a webhook runs out of retries.
   *
   * getInvoicesNeedingUrlConfirmation() filters on retries < maxRetries, so the
   * last failure is the point of no return: the invoice leaves the delivery
   * queue for good and the merchant is left believing a payment never landed.
   * The per-attempt emails go to the merchant; this is the operator's copy.
   */
  private async alertIfRetriesExhausted(
    invoice: InvoiceData,
    commerce: CommerceData,
    retryCount: number,
    errorDetails: string
  ): Promise<void> {
    if (retryCount < this.maxRetries) return;

    try {
      const esc = (s: string) =>
        String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const text = [
        '🚨 <b>Webhook agotó reintentos</b>',
        '',
        `<b>Comercio:</b> ${esc(commerce.name)}`,
        `<b>Invoice:</b> <code>${esc(invoice.id)}</code>`,
        `<b>Estado:</b> ${esc(invoice.status)} — ${esc(String(invoice.amount_fiat))} ${esc(invoice.fiat_currency)}`,
        `<b>URL:</b> <code>${esc(commerce.confirmation_url || '—')}</code>`,
        `<b>Intentos:</b> ${retryCount}/${this.maxRetries} (sin reintentos restantes)`,
        '',
        `<b>Último error:</b> <code>${esc(errorDetails).slice(0, 600)}</code>`,
        '',
        `Reintentar: <code>POST /admin/invoices/${esc(invoice.id)}/retry</code>`,
      ].join('\n');

      await sendTelegramAlert(`webhook_exhausted_${invoice.id}`, text);
    } catch (err: any) {
      console.error(`[notify] Webhook exhaustion alert failed for ${invoice.id}:`, err.message);
    }
  }

  /**
   * Send data to commerce confirmation URL.
   *
   * Delegates to deliverWebhook so the dashboard's resend and test buttons send
   * a byte-identical request: an integrator who certifies against the button has
   * certified against this path too.
   *
   * Returns the full result rather than a boolean so the failure email can name
   * the status code instead of saying "HTTP Error Response" — the message that
   * left us digging through the database by hand when a real payment failed.
   */
  private async sendToConfirmationUrl(invoice: InvoiceData, commerce: CommerceData): Promise<DeliveryResult> {
    // TypeScript requires this check since confirmation_url can be null
    if (!commerce.confirmation_url) {
      console.error(`No confirmation URL configured for commerce ${commerce.id}`);
      return { ok: false, status: null, body: null, durationMs: 0, error: 'No confirmation URL configured', signed: false };
    }

    return deliverWebhook(commerce.confirmation_url, commerce.webhook_secret, buildPayload(invoice));
  }

  /** One line naming what actually went wrong, for the email and the logs. */
  private describeDelivery(result: DeliveryResult): string {
    if (result.error) return result.error;
    const body = result.body ? ` — ${result.body.slice(0, 200)}` : '';
    return `HTTP ${result.status} in ${result.durationMs}ms${body}`;
  }

  /**
   * Send confirmation URL failure notification email
   */
  private async sendConfirmationUrlFailureEmail(invoice: InvoiceData, commerce: CommerceData, retryCount: number, errorDetails: string): Promise<void> {
    try {
      const remainingRetries = this.maxRetries - retryCount;
      const emailContent = this.generateConfirmationUrlFailureEmailHtml(invoice, commerce, retryCount, remainingRetries, errorDetails);
      
      await resend.emails.send({
        from: 'Voulti <noreply@notifications.voulti.com>',
        to: [commerce.confirmation_email!],
        subject: `Confirmation URL Failed - Invoice #${invoice.id}`,
        html: emailContent,
      });
      
      console.log(`✅ Confirmation URL failure email sent for invoice ${invoice.id}. Retry ${retryCount}/${this.maxRetries}`);
    } catch (error) {
      console.error(`❌ Failed to send confirmation URL failure email for invoice ${invoice.id}:`, error);
    }
  }

  /**
   * Send email based on invoice status
   */
  private async sendStatusEmail(invoice: InvoiceData, commerce: CommerceData): Promise<void> {
    try {
      const { subject, emailContent } = this.getEmailContentByStatus(invoice, commerce);
      
      await resend.emails.send({
        from: 'Voulti <noreply@notifications.voulti.com>',
        to: [commerce.confirmation_email!], // commerce.confirmation_email is guaranteed to exist due to prior validation
        subject,
        html: emailContent,
      });
      
      console.log(`✅ ${invoice.status} email sent for invoice ${invoice.id} to ${commerce.name}`);
    } catch (error) {
      console.error(`❌ Failed to send ${invoice.status} email for invoice ${invoice.id}:`, error);
      throw error;
    }
  }

  /**
   * Get email content based on invoice status
   */
  private getEmailContentByStatus(invoice: InvoiceData, commerce: CommerceData): { subject: string; emailContent: string } {
    switch (invoice.status) {
      case 'Paid':
        return {
          subject: `Payment Confirmed - Invoice #${invoice.id}`,
          emailContent: this.generateEmailHtml(invoice, commerce, 'Paid')
        };
      case 'Expired':
        return {
          subject: `Invoice Expired - Invoice #${invoice.id}`,
          emailContent: this.generateEmailHtml(invoice, commerce, 'Expired')
        };
      case 'Refunded':
        return {
          subject: `Refund Processed - Invoice #${invoice.id}`,
          emailContent: this.generateEmailHtml(invoice, commerce, 'Refunded')
        };
      default:
        throw new Error(`Unsupported email status: ${invoice.status}`);
    }
  }

  /**
   * Get commerce data from database
   */
  private async getCommerceData(commerceId: string): Promise<CommerceData | null> {
    const { data, error } = await supabase
      .from('commerces')
      .select('id, name, confirmation_url, confirmation_email, webhook_secret')
      .eq('id', commerceId)
      .single();

    if (error) {
      console.error('Error fetching commerce data:', error);
      return null;
    }

    return data;
  }

  /**
   * Update invoice field in database
   */
  private async updateInvoiceField(invoiceId: string, field: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .update({ [field]: value })
      .eq('id', invoiceId);

    if (error) {
      console.error(`Error updating ${field} for invoice ${invoiceId}:`, error);
    }
  }

  /**
   * Get invoices that need email notifications
   * Criteria: status IN ('Paid', 'Expired', 'Refunded') AND confirmation_email_available = true AND confirmation_email_sent = false
   * Note: Expired invoices don't require blockchain verification
   */
  private async getInvoicesNeedingEmailNotification(): Promise<InvoiceData[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['Paid', 'Expired', 'Refunded'])
      .eq('confirmation_email_available', true)
      .eq('confirmation_email_sent', false);

    if (error) {
      console.error('Error fetching invoices needing email notification:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get invoices that need URL confirmation attempts
   * Criteria: status IN ('Paid', 'Expired', 'Refunded') AND confirmation_url_available = true AND 
   *          confirmation_url_response = false AND confirmation_url_retries < 5
   */
  private async getInvoicesNeedingUrlConfirmation(): Promise<InvoiceData[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .in('status', ['Paid', 'Expired', 'Refunded'])
      .eq('confirmation_url_available', true)
      .eq('confirmation_url_response', false)
      .lt('confirmation_url_retries', this.maxRetries);
    // Deliberately not filtering on selected_network / blockchain_invoice_id.
    // Those are null for every invoice that never settled on-chain — exactly
    // the Expired and Refunded ones the merchant most needs to hear about.
    // `Paid` still gets its on-chain proof: verifyBlockchainStatus rejects a
    // null blockchain_invoice_id on its own.

    if (error) {
      console.error('Error fetching invoices needing URL confirmation:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Generate HTML content for email based on status
   */
  private generateEmailHtml(invoice: InvoiceData, commerce: CommerceData, status: string): string {
    const { title, emoji, color, message, detailsTitle, backgroundColor } = this.getEmailConfig(status);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${color};">${emoji} ${title}</h2>
        <p>Dear ${commerce.name},</p>
        <p>${message}</p>
        
        ${this.getStatusSpecificDetails(invoice, status)}
        
        ${this.getStatusSpecificFooter(status)}
        <p>Best regards,<br>The Voulti Team</p>
      </body>
      </html>
    `;
  }

  /**
   * Get email configuration based on status
   */
  private getEmailConfig(status: string): { title: string; emoji: string; color: string; message: string; detailsTitle: string; backgroundColor: string } {
    switch (status) {
      case 'Paid':
        return {
          title: 'Payment Confirmed',
          emoji: '✅',
          color: '#28a745',
          message: 'A payment has been successfully confirmed and processed for one of your invoices.',
          detailsTitle: 'Payment Details',
          backgroundColor: '#f8f9fa'
        };
      case 'Expired':
        return {
          title: 'Invoice Expired',
          emoji: '⏰',
          color: '#ffc107',
          message: 'One of your invoices has expired and is no longer available for payment.',
          detailsTitle: 'Invoice Details',
          backgroundColor: '#fff3cd'
        };
      case 'Refunded':
        return {
          title: 'Refund Processed',
          emoji: '💰',
          color: '#17a2b8',
          message: 'A refund has been successfully processed for one of your invoices.',
          detailsTitle: 'Refund Details',
          backgroundColor: '#d1ecf1'
        };
      default:
        throw new Error(`Unsupported email status: ${status}`);
    }
  }

  /**
   * Get status-specific details for email
   */
  private getStatusSpecificDetails(invoice: InvoiceData, status: string): string {
    switch (status) {
      case 'Paid':
        return this.getPaidInvoiceDetails(invoice);
      case 'Expired':
        return this.getExpiredInvoiceDetails(invoice);
      case 'Refunded':
        return this.getRefundedInvoiceDetails(invoice);
      default:
        return '';
    }
  }

  /**
   * Get basic payment information (for all users)
   */
  private getBasicPaymentInfo(invoice: InvoiceData): string {
    const paymentDate = invoice.paid_at ? this.formatDate(invoice.paid_at) : 'Just now';
    
    return `
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
        <h4 style="margin: 0 0 10px 0; color: #155724;">Payment Details</h4>
        <p><strong>Invoice ID:</strong> ${invoice.id}</p>
        <p><strong>Amount:</strong> ${invoice.amount_fiat} ${invoice.fiat_currency}</p>
        <p><strong>Payment Date:</strong> ${paymentDate}</p>
      </div>
    `;
  }

  /**
   * Get blockchain technical details (for advanced users)
   */
  private getBlockchainDetails(invoice: InvoiceData): string {
    if (!invoice.paid_tx_hash && !invoice.paid_token && !invoice.paid_network) {
      return '';
    }

    return `
      <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #6c757d;">
        <h4 style="margin: 0 0 10px 0; color: #495057;">Blockchain Details</h4>
        ${invoice.paid_tx_hash && invoice.paid_network ? `<p><strong>Transaction Receipt:</strong> <a href="${getBlockExplorerUrl(invoice.paid_network, invoice.paid_tx_hash)}" target="_blank">View on ${getNetworkDisplayName(invoice.paid_network)} Explorer</a></p>` : ''}
        ${invoice.paid_token && invoice.paid_amount ? `<p><strong>Token Amount:</strong> ${invoice.paid_amount} ${getTokenSymbol(invoice.paid_token, invoice.paid_network)}</p>` : ''}
        ${invoice.paid_token ? `<p><strong>Token Symbol:</strong> ${getTokenSymbol(invoice.paid_token, invoice.paid_network)}</p>` : ''}
        ${invoice.paid_token ? `<p><strong>Token Contract:</strong> ${getTokenAddress(invoice.paid_token, invoice.paid_network) || invoice.paid_token}</p>` : ''}
        ${invoice.paid_network ? `<p><strong>Network:</strong> ${getNetworkDisplayName(invoice.paid_network)}</p>` : ''}
      </div>
    `;
  }

  /**
   * Get paid invoice details with separated basic and blockchain info
   */
  private getPaidInvoiceDetails(invoice: InvoiceData): string {
    return this.getBasicPaymentInfo(invoice) + this.getBlockchainDetails(invoice);
  }

  /**
   * Get expired invoice details
   */
  private getExpiredInvoiceDetails(invoice: InvoiceData): string {
    const expiredDate = this.formatDate(new Date().toISOString());
    
    return `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
        <h4 style="margin: 0 0 10px 0; color: #856404;">⏰ Invoice Expiration Details</h4>
        <p><strong>Invoice ID:</strong> ${invoice.id}</p>
        <p><strong>Amount:</strong> ${invoice.amount_fiat} ${invoice.fiat_currency}</p>
        <p><strong>Expired Date:</strong> ${expiredDate}</p>
      </div>
    `;
  }

  /**
   * Get refunded invoice details
   */
  private getRefundedInvoiceDetails(invoice: InvoiceData): string {
    const refundDate = this.formatDate(new Date().toISOString());
    
    return `
      <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #17a2b8;">
        <h4 style="margin: 0 0 10px 0; color: #0c5460;">💰 Refund Details</h4>
        <p><strong>Invoice ID:</strong> ${invoice.id}</p>
        <p><strong>Amount:</strong> ${invoice.amount_fiat} ${invoice.fiat_currency}</p>
        <p><strong>Refund Date:</strong> ${refundDate}</p>
      </div>
    `;
  }

  /**
   * Format date to user-friendly format
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      });
    } catch (error) {
      return dateString; // Fallback to original string if parsing fails
    }
  }

  /**
   * Generate HTML content for confirmation URL failure email
   */
  private generateConfirmationUrlFailureEmailHtml(invoice: InvoiceData, commerce: CommerceData, retryCount: number, remainingRetries: number, errorDetails: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmation URL Failed</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">⚠️ Confirmation URL Failed</h2>
        <p>Dear ${commerce.name},</p>
        <p>We're having trouble reaching your confirmation URL for invoice payment notifications.</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Failure Details:</h3>
          <p><strong>Invoice ID:</strong> ${invoice.id}</p>
          <p><strong>Confirmation URL:</strong> ${commerce.confirmation_url}</p>
          <strong>Error Details:</strong> ${errorDetails}</p>
          <p><strong>Current Retry:</strong> ${retryCount}/${this.maxRetries}</p>
          <p><strong>Remaining Retries:</strong> ${remainingRetries}</p>
        </div>
        
        <p>Please check your webhook endpoint and ensure it's responding correctly to our requests.</p>
        <p>We will continue trying ${remainingRetries} more times.</p>
        <p>Best regards,<br>The Voulti Team</p>
      </body>
      </html>
    `;
  }



  /**
   * Get status-specific footer for email
   */
  private getStatusSpecificFooter(status: string): string {
    switch (status) {
      case 'Paid':
        return '<p>This payment has been processed and your customer has been notified.</p>';
      case 'Expired':
        return '<p>You may want to contact your customer to create a new invoice if payment is still needed.</p>';
      case 'Refunded':
        return '<p>The refund has been processed and should appear in your account now.</p>';
      default:
        return '';
    }
  }




}
