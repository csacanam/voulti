import { FastifyInstance } from 'fastify';
import { InvoiceService } from '../blockchain/services/InvoiceServices';
import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { NETWORKS } from '../blockchain/config/networks';

// Helper function to get network name by chainId
function getNetworkByChainId(chainId: number): keyof typeof NETWORKS {
  const network = Object.entries(NETWORKS).find(([_, config]) => config.chainId === chainId);
  if (!network) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }
  return network[0] as keyof typeof NETWORKS;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function blockchainRoutes(app: FastifyInstance) {
  // No global initialization needed - services are created per request

  // Create invoice on blockchain
  app.post('/create', async (req, res) => {
    try {
      const { invoiceId, paymentOptions, expiresAt, chainId, supportsENS } = req.body as any;

      // Validate required fields
      if (!invoiceId || !paymentOptions || !chainId) {
        return res.status(400).send({
          error: 'Missing required fields: invoiceId, paymentOptions, chainId'
        });
      }

      // Validate chainId
      if (typeof chainId !== 'number') {
        return res.status(400).send({
          error: 'chainId must be a number'
        });
      }

      // Get network name from chainId
      let networkName: keyof typeof NETWORKS;
      try {
        networkName = getNetworkByChainId(chainId);
      } catch (error) {
        return res.status(400).send({
          error: `Unsupported chainId: ${chainId}. Supported chainIds: ${Object.values(NETWORKS).map(n => n.chainId).join(', ')}`
        });
      }

      // Check if invoice already has a selected network (already created on blockchain)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          commerces (
            wallet
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        console.log('❌ [CREATE] Invoice not found in backend:', { invoiceId, error: invoiceError?.message });
        return res.status(404).send({
          error: 'Invoice not found in backend'
        });
      }



      // ✅ EARLY VALIDATION: If invoice already has selected_network, it's already on blockchain
      if (invoice.selected_network) {
        const selectedChainId = invoice.selected_network;
        const requestedChainId = NETWORKS[networkName].chainId;
        
        return res.status(400).send({
          error: `Invoice already exists on blockchain with chainId ${selectedChainId}. Cannot create again.`,
          data: {
            invoiceId,
            selectedNetwork: selectedChainId,
            requestedNetwork: requestedChainId
          }
        });
      }

      // VALIDATIONS: Check all business rules before creating on blockchain
      
      // Get commerce wallet from the joined data
      const commerceWallet = (invoice.commerces as any)?.wallet;
      if (!commerceWallet) {
        return res.status(500).send({
          error: 'Commerce wallet not found'
        });
      }

      // Check if invoice status is Pending
      if (invoice.status !== 'Pending') {
        return res.status(400).send({
          error: `Invoice status is ${invoice.status}, must be Pending`
        });
      }

      // Check if invoice has not expired
      if (invoice.expires_at) {
        const expirationTime = new Date(invoice.expires_at).getTime();
        const currentTime = Date.now();
        
        if (currentTime > expirationTime) {
          return res.status(400).send({
            error: 'Invoice has expired'
          });
        }
      }

      // Set expiration time from backend invoice or use provided value
      const finalExpiresAt = expiresAt || (invoice.expires_at ? Math.floor(new Date(invoice.expires_at).getTime() / 1000) : Math.floor(Date.now() / 1000) + 60 * 60);

      // Convert UUID to hash for blockchain
      const blockchainInvoiceId = ethers.id(invoiceId);

      // Create invoice service for the specified network with ENS support configuration
      const invoiceService = new InvoiceService(networkName, supportsENS);
      await invoiceService.init(process.env.PRIVATE_KEY!);

      const result = await invoiceService.createInvoice({
        invoiceId: blockchainInvoiceId,
        commerce: commerceWallet,
        paymentOptions,
        expiresAt: finalExpiresAt
      });



      // Update database with selected network
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          selected_network: NETWORKS[networkName].chainId,
          blockchain_invoice_id: blockchainInvoiceId 
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating database:', updateError);
        // Don't fail the operation, just log the error
      }

      return res.send({
        success: true,
        data: {
          // Backend invoice info
          invoiceId: invoiceId, // Original UUID from backend
          commerce: commerceWallet,
          expiresAt: finalExpiresAt,
          paymentOptions: paymentOptions,
          
          // Blockchain info
          blockchainInvoiceId: blockchainInvoiceId, // Blockchain hash
          selectedNetwork: NETWORKS[networkName].chainId,
        }
      });

    } catch (error: any) {
      console.error('Blockchain error:', error);
      return res.status(400).send({
        error: error.message || 'Failed to create invoice on blockchain'
      });
    }
  });

  // Get invoice status from blockchain
  app.get('/status/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params as { invoiceId: string };
      const { chainId, supportsENS } = req.query as { chainId: string; supportsENS?: string };

      // Validate chainId parameter
      if (!chainId) {
        return res.status(400).send({
          error: 'Missing required parameter: chainId'
        });
      }

      // Validate chainId
      const chainIdNum = parseInt(chainId);
      if (isNaN(chainIdNum)) {
        return res.status(400).send({
          error: 'chainId must be a valid number'
        });
      }

      // Get network name from chainId
      let networkName: keyof typeof NETWORKS;
      try {
        networkName = getNetworkByChainId(chainIdNum);
      } catch (error) {
        return res.status(400).send({
          error: `Unsupported chainId: ${chainIdNum}. Supported chainIds: ${Object.values(NETWORKS).map(n => n.chainId).join(', ')}`
        });
      }

      // Convert supportsENS string to boolean
      const supportsENSBool = supportsENS === 'true' ? true : supportsENS === 'false' ? false : undefined;

      // Create invoice service for the specified network with ENS support configuration
      const invoiceService = new InvoiceService(networkName, supportsENSBool);
      await invoiceService.init(process.env.PRIVATE_KEY!);

      // Convert UUID to bytes32 for blockchain
      const blockchainInvoiceId = ethers.id(invoiceId);
      
      // Get invoice status from blockchain
      console.log('🔍 [DEBUG] Calling getInvoiceStatus with:', { blockchainInvoiceId });
      const invoiceStatus = await invoiceService.getInvoiceStatus(blockchainInvoiceId);
      console.log('🔍 [DEBUG] getInvoiceStatus response:', invoiceStatus);

      return res.send({
        success: true,
        data: {
          invoiceId,
          ...invoiceStatus
        }
      });

    } catch (error: any) {
      console.error('Error getting invoice status:', error);
      return res.status(500).send({
        error: error.message || 'Failed to get invoice status'
      });
    }
  });

  // Cancel invoice on blockchain and update database
  app.post('/cancel/:invoiceId', async (req, res) => {
    try {
      const { invoiceId } = req.params as { invoiceId: string };
      const { chainId, supportsENS } = req.body as { chainId: number; supportsENS?: boolean };

      // Validate chainId parameter
      if (!chainId) {
        return res.status(400).send({
          error: 'Missing required field: chainId'
        });
      }

      // Get network name from chainId
      let networkName: keyof typeof NETWORKS;
      try {
        networkName = getNetworkByChainId(chainId);
      } catch (error) {
        return res.status(400).send({
          error: `Unsupported chainId: ${chainId}. Supported chainIds: ${Object.values(NETWORKS).map(n => n.chainId).join(', ')}`
        });
      }

      // Create invoice service for the specified network with ENS support configuration
      const invoiceService = new InvoiceService(networkName, supportsENS);
      await invoiceService.init(process.env.PRIVATE_KEY!);

      // Convert UUID to bytes32 for blockchain
      const blockchainInvoiceId = ethers.id(invoiceId);
      
      // Check if invoice can be cancelled (only pending invoices can be cancelled)
      console.log('🔍 [DEBUG] Calling getInvoiceStatus for cancel with:', { blockchainInvoiceId });
      const invoiceStatus = await invoiceService.getInvoiceStatus(blockchainInvoiceId);
      console.log('🔍 [DEBUG] getInvoiceStatus response for cancel:', invoiceStatus);
      
      if (invoiceStatus.status !== 'pending') {
        return res.status(400).send({
          error: `Invoice cannot be cancelled. Current status: ${invoiceStatus.status}`,
          data: {
            invoiceId,
            blockchainInvoiceId,
            status: invoiceStatus.status,
            commerce: invoiceStatus.commerce,
            expiresAt: invoiceStatus.expiresAt
          }
        });
      }

      // Cancel the invoice in blockchain
      const cancelResult = await invoiceService.cancelInvoice(blockchainInvoiceId);

      if (!cancelResult.success) {
        return res.status(500).send({
          error: 'Failed to cancel invoice in blockchain',
          details: cancelResult.error
        });
      }

      // Update invoice status in database
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'Expired',
          expired_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (updateError) {
        console.error('Error updating database:', updateError);
        return res.status(500).send({
          error: 'Invoice cancelled in blockchain but failed to update database',
          details: updateError.message
        });
      }

      return res.send({
        success: true,
        data: {
          invoiceId,
          blockchainInvoiceId,
          message: 'Invoice cancelled successfully in both blockchain and database',
          transactionHash: cancelResult.transactionHash,
          blockNumber: cancelResult.blockNumber,
          blockchainStatus: 'expired',
          databaseStatus: 'Expired'
        }
      });

    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      return res.status(500).send({
        error: error.message || 'Failed to cancel invoice'
      });
    }
  });



} 