// src/blockchain/services/InvoiceService.ts
import { ethers } from 'ethers';
import { DerampService } from './DerampServices';
import { handleBlockchainError } from '../utils/errors';

interface PaymentOption {
  token: string;
  amount: string | number;
  decimals?: number;
}

interface CreateInvoiceParams {
  invoiceId: string;
  commerce: string;
  paymentOptions: PaymentOption[];
  expiresAt: number;
}

interface CreateInvoiceResult {
  success: boolean;
  transactionHash: string;
  invoiceId: string;
  blockNumber: number;
}

interface InvoiceStatus {
  exists: boolean;
  status: string;
  commerce: string;
  expiresAt: number;
  paymentOptions: PaymentOption[];
  paidAmount?: string;
  paidToken?: string;
  paidAt?: number;
}

interface WhitelistedToken {
  token: string;
  isWhitelisted: boolean;
}

export class InvoiceService extends DerampService {
  constructor(network: keyof typeof import('../config/networks').NETWORKS, supportsENS?: boolean) {
    super(network, supportsENS);
  }

  async isTokenWhitelistedForCommerce(commerce: string, token: string): Promise<boolean> {
    try {
      if (!this.contract) throw new Error("Contract not initialized");
      
      // Get the AccessManager address from the proxy contract
      const accessManagerAddress = await this.contract.accessManager();
      
      // Create a contract instance for the AccessManager using the wallet
      const accessManagerContract = new ethers.Contract(
        accessManagerAddress,
        [
          // Check if token is whitelisted for commerce
          "function isTokenWhitelistedForCommerce(address commerce, address token) external view returns (bool)"
        ],
        this.wallet
      );
      
      // Check if token is whitelisted for this commerce
      const isWhitelisted = await accessManagerContract.isTokenWhitelistedForCommerce(commerce, token);
      
      return isWhitelisted;
    } catch (error) {
      handleBlockchainError(error);
    }
  }

  async getWhitelistedTokensForCommerce(commerce: string): Promise<string[]> {
    try {
      if (!this.contract) throw new Error("Contract not initialized");
      
      // Get the AccessManager address from the proxy contract
      const accessManagerAddress = await this.contract.accessManager();
      
      // Create a contract instance for the AccessManager using the wallet
      const accessManagerContract = new ethers.Contract(
        accessManagerAddress,
        [
          // Get all whitelisted tokens
          "function getWhitelistedTokens() external view returns (address[])",
          // Check if token is whitelisted for commerce
          "function isTokenWhitelistedForCommerce(address commerce, address token) external view returns (bool)"
        ],
        this.wallet
      );

      // Get all whitelisted tokens
      const allWhitelistedTokens = await accessManagerContract.getWhitelistedTokens();
      
      // Check which ones are whitelisted for this specific commerce
      const commerceWhitelistedTokens: string[] = [];
      
      for (const token of allWhitelistedTokens) {
        const isWhitelisted = await accessManagerContract.isTokenWhitelistedForCommerce(commerce, token);
        if (isWhitelisted) {
          commerceWhitelistedTokens.push(token);
        }
      }

      return commerceWhitelistedTokens;
    } catch (error) {
      console.error('Error getting whitelisted tokens for commerce:', error);
      return [];
    }
  }

  async validatePaymentOptions(commerce: string, paymentOptions: PaymentOption[]): Promise<{ 
    valid: boolean; 
    errors: string[];
    inconsistencies?: string[]; // New field to report inconsistencies
  }> {
    try {
      const errors: string[] = [];
      const inconsistencies: string[] = [];

      for (const option of paymentOptions) {
        // 1. Blockchain validation (source of truth)
        const blockchainWhitelisted = await this.isTokenWhitelistedForCommerce(commerce, option.token);
        
        // 2. Final validation (use blockchain as source of truth)
        if (!blockchainWhitelisted) {
          errors.push(`Token ${option.token} (${getTokenSymbol(option.token)}) is not whitelisted for commerce ${commerce}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        inconsistencies: inconsistencies.length > 0 ? inconsistencies : undefined
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message || 'Failed to validate payment options']
      };
    }
  }

  async createInvoice({ invoiceId, commerce, paymentOptions, expiresAt }: CreateInvoiceParams): Promise<CreateInvoiceResult> {
    try {
      if (!this.contract) throw new Error("Contract not initialized");
      if (!invoiceId || !commerce || !paymentOptions || !expiresAt) {
        throw new Error("Incomplete invoice data");
      }

      // Validate that all payment options use whitelisted tokens
      const validation = await this.validatePaymentOptions(commerce, paymentOptions);
      if (!validation.valid) {
        throw new Error(`Invalid payment options: ${validation.errors.join(', ')}`);
      }

      const formattedOptions = paymentOptions.map((option) => ({
        token: option.token,
        amount: ethers.parseUnits(option.amount.toString(), option.decimals || 18),
      }));

      const tx = await this.contract.createInvoice(
        invoiceId,
        commerce,
        formattedOptions,
        expiresAt
      );
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        invoiceId,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      handleBlockchainError(error);
    }
  }

  async getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus> {
    try {
      if (!this.contract) throw new Error("Contract not initialized");
      
      // Get the InvoiceManager address from the proxy contract
      const invoiceManagerAddress = await this.contract.invoiceManager();
      
      // Create a contract instance for the InvoiceManager using the wallet
      const invoiceManagerContract = new ethers.Contract(
        invoiceManagerAddress,
        [
          // Real getInvoice function signature
          "function getInvoice(bytes32 id) external view returns (bytes32 invoiceId, address payer, address commerce, address paidToken, uint256 paidAmount, uint8 status, uint256 createdAt, uint256 expiresAt, uint256 paidAt, uint256 refundedAt, uint256 expiredAt)",
          // Get payment options
          "function getInvoicePaymentOptions(bytes32 id) external view returns (tuple(address token, uint256 amount)[])"
        ],
        this.wallet
      );
      
      // Get invoice information
      const invoiceData = await invoiceManagerContract.getInvoice(invoiceId);
      
      // Check if invoice exists (if invoiceId is not empty)
      if (!invoiceData.invoiceId || invoiceData.invoiceId === ethers.ZeroHash) {
        return {
          exists: false,
          status: 'not_found',
          commerce: '',
          expiresAt: 0,
          paymentOptions: []
        };
      }
      
      // Map status enum to string
      const statusMap: { [key: number]: string } = {
        0: 'pending',
        1: 'paid',
        2: 'refunded',
        3: 'expired'
      };
      
      const status = statusMap[Number(invoiceData.status)] || 'unknown';

      // Get payment options with correct decimals per token
      const ERC20_DECIMALS_ABI = ['function decimals() view returns (uint8)'];
      const paymentOptionsData = await invoiceManagerContract.getInvoicePaymentOptions(invoiceId);
      const paymentOptions = await Promise.all(
        paymentOptionsData.map(async (option: any) => {
          let decimals = 18;
          try {
            const tokenContract = new ethers.Contract(option.token, ERC20_DECIMALS_ABI, this.provider!);
            decimals = Number(await tokenContract.decimals());
          } catch {
            // fallback to 18
          }
          return {
            token: option.token,
            amount: ethers.formatUnits(option.amount, decimals)
          };
        })
      );

      // Add payment information if invoice is paid
      let paidAmount, paidToken, paidAt;
      if (status === 'paid') {
        let paidDecimals = 18;
        try {
          const paidTokenContract = new ethers.Contract(invoiceData.paidToken, ERC20_DECIMALS_ABI, this.provider!);
          paidDecimals = Number(await paidTokenContract.decimals());
        } catch {
          // fallback
        }
        paidAmount = ethers.formatUnits(invoiceData.paidAmount, paidDecimals);
        paidToken = invoiceData.paidToken;
        paidAt = Number(invoiceData.paidAt);
      }

      return {
        exists: true,
        status,
        commerce: invoiceData.commerce,
        expiresAt: Number(invoiceData.expiresAt),
        paymentOptions,
        paidAmount,
        paidToken,
        paidAt
      };
    } catch (error) {
      handleBlockchainError(error);
    }
  }

  async cancelInvoice(invoiceId: string): Promise<{ success: boolean; transactionHash?: string; blockNumber?: number; error?: string }> {
    try {
      if (!this.contract) throw new Error("Contract not initialized");
      
      // Use the cancelInvoice function from DerampProxy
      const tx = await this.contract.cancelInvoice(invoiceId);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to cancel invoice'
      };
    }
  }
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