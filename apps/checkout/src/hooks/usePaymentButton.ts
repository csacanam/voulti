import { useAccount, useChainId } from 'wagmi';
import { ethers } from 'ethers';
import { useCallback, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { CONTRACTS, TOKENS, findChainConfigByChainId } from '../config/chains';
import { BlockchainService } from '../services/blockchainService';
import { ButtonState, PaymentOption } from '../blockchain/types';

// Network validation function
const validateNetwork = (currentChainId: number, selectedNetwork: number | undefined): { isValid: boolean; message?: string } => {
  if (!selectedNetwork) {
    return { isValid: true }; // No network selected yet, can proceed
  }

  if (currentChainId === selectedNetwork) {
    return { isValid: true };
  }

  // Get network names for better error messages
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 42220: return 'Celo';
      case 42161: return 'Arbitrum One';
      case 137: return 'Polygon';
      case 8453: return 'Base';
      case 56: return 'BNB Smart Chain';
      default: return `Chain ID ${chainId}`;
    }
  };

  return {
    isValid: false,
    message: `Este invoice fue creado en ${getNetworkName(selectedNetwork)}, pero estás conectado a ${getNetworkName(currentChainId)}. Por favor, cambia a la red correcta.`
  };
};

interface UsePaymentButtonProps {
  invoiceId: string;
  paymentOptions: PaymentOption[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onPaymentCancelled?: () => void;
  hasSufficientBalance?: boolean;
  selectedNetwork?: number; // Add selectedNetwork from invoice
  selectedTokenNetwork?: any; // Add selectedTokenNetwork for price validation
}

export const usePaymentButton = ({ 
  invoiceId, 
  paymentOptions, 
  onSuccess, 
  onError,
  onPaymentCancelled,
  hasSufficientBalance = true,
  selectedNetwork,
  selectedTokenNetwork
}: UsePaymentButtonProps) => {
  const [buttonState, setButtonState] = useState<ButtonState>('initial');
  const [selectedToken, setSelectedToken] = useState<string>('');
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { language, t } = useLanguage();

  const getButtonText = useCallback((state: ButtonState, tokenSymbol?: string) => {
    const isSpanish = language === 'es';
    
    switch (state) {
      case 'initial':
        return isSpanish ? 'Pagar ahora' : 'Pay Now';
      case 'loading':
        return isSpanish ? 'Preparando tu pago...' : 'Preparing your payment...';
      case 'ready':
        return isSpanish ? `Autorizar ${tokenSymbol}` : `Authorize ${tokenSymbol}`;
      case 'approving':
        return isSpanish ? `Autorizando ${tokenSymbol}...` : `Authorizing ${tokenSymbol}...`;
      case 'confirm':
        return isSpanish ? 'Confirmar pago' : 'Confirm Payment';
      case 'processing':
        return isSpanish ? 'Procesando pago...' : 'Processing payment...';
      default:
        return isSpanish ? 'Pagar ahora' : 'Pay Now';
    }
  }, [language]);

  // Validate network if selectedNetwork is provided
  const validateNetwork = (currentChainId: number, selectedNetwork: number | undefined): { isValid: boolean; message?: string } => {
    if (!selectedNetwork) {
      return { isValid: true };
    }
    
    if (currentChainId === selectedNetwork) {
      return { isValid: true };
    }
    
    const getNetworkName = (chainId: number): string => {
      switch (chainId) {
        case 42220: return 'Celo';
        case 42161: return 'Arbitrum One';
        case 137: return 'Polygon';
        case 8453: return 'Base';
        case 56: return 'BNB Smart Chain';
        default: return `Chain ID ${chainId}`;
      }
    };
    
    return {
      isValid: false,
      message: `Este invoice fue creado en ${getNetworkName(selectedNetwork)}, pero estás conectado a ${getNetworkName(currentChainId)}. Por favor, cambia a la red correcta.`
    };
  };

  const handlePayNow = useCallback(async () => {
    if (!isConnected || !address || !chainId) {
      onError?.('Please connect your wallet first');
      return;
    }

    if (paymentOptions.length === 0) {
      onError?.('No payment options available');
      return;
    }

    if (!hasSufficientBalance) {
      onError?.('Insufficient balance');
      return;
    }

    // Network validation - check if user is on the correct network
    const networkValidation = validateNetwork(chainId, selectedNetwork);
    if (!networkValidation.isValid) {
      onError?.(networkValidation.message || 'Network mismatch');
      return;
    }

    setButtonState('loading');

    try {
      // Get chain configuration using the new consolidated approach
      const chainConfig = findChainConfigByChainId(chainId);
      if (!chainConfig) {
        throw new Error('Unsupported network');
      }
      
      // Step 1: Check blockchain status
      const statusResponse = await BlockchainService.getStatus(invoiceId, chainId);
      
      if (statusResponse.success) {
        const { exists, status } = statusResponse.data;
        
        if (!exists) {
          // Convert token symbols to addresses for blockchain creation
          const networkTokens = chainConfig.tokens;
          if (!networkTokens) {
            throw new Error('Unsupported network');
          }

          const blockchainPaymentOptions = paymentOptions.map(option => {
            // Find token config by symbol (case-insensitive)
            const tokenConfig = Object.values(networkTokens).find(
              token => token.symbol.toLowerCase() === option.token.toLowerCase()
            );
            if (!tokenConfig) {
              throw new Error(`Unsupported token: ${option.token}`);
            }
            
            return {
              token: tokenConfig.address,
              amount: option.amount,
              decimals: tokenConfig.decimals,
            };
          });

          // Create invoice on blockchain
          const createResponse = await BlockchainService.createInvoice({
            invoiceId,
            paymentOptions: blockchainPaymentOptions,
            chainId: chainId, // Use chainId instead of network
          });
          
          if (createResponse.success) {
            setSelectedToken(paymentOptions[0].token);
            setButtonState('ready');
          } else {
            throw new Error('Failed to create invoice on blockchain');
          }
        } else if (status === 'pending') {
          // Invoice exists and is pending, ready to authorize
          setSelectedToken(paymentOptions[0].token);
          setButtonState('ready');
        } else if (['expired', 'refunded', 'paid'].includes(status)) {
          // Backend automatically handles status updates, just refresh the page
          window.location.reload();
        } else {
          throw new Error(`Unexpected invoice status: ${status}`);
        }
      } else {
        throw new Error('Failed to get blockchain status');
      }
    } catch (error) {
      setButtonState('initial');
      
      // Provide user-friendly error messages
      let userMessage = t.payment?.paymentFailed || 'Payment failed';
      
      if (error instanceof Error) {
        if (error.message.includes('ENS') || error.message.includes('network does not support')) {
          userMessage = t.payment?.networkConfigError || 'Network configuration error';
        } else if (error.message.includes('HTTP error! status: 400')) {
          // Check if it's a token whitelist error
          if (error.message.includes('is not whitelisted for commerce')) {
            // Extract token symbol from error message
            const tokenMatch = error.message.match(/Token.*?\((.*?)\)/);
            const tokenSymbol = tokenMatch ? tokenMatch[1] : selectedToken || 'este token';
            userMessage = t.payment?.tokenNotWhitelisted?.replace('{symbol}', tokenSymbol) || 
                         `El comercio no está recibiendo ${tokenSymbol} en este momento. Elige otro token.`;
          } else {
            userMessage = t.payment?.unableToPrepare || 'Unable to prepare payment';
          }
        } else if (error.message.includes('Failed to create invoice on blockchain')) {
          userMessage = t.payment?.unableToCreateBlockchain || 'Unable to create blockchain invoice';
        } else if (error.message.includes('Failed to get blockchain status')) {
          userMessage = t.payment?.unableToVerifyStatus || 'Unable to verify status';
        } else {
          userMessage = error.message;
        }
      }
      
      onError?.(userMessage);
    }
  }, [invoiceId, paymentOptions, isConnected, address, chainId, onError, t.payment, selectedToken, hasSufficientBalance, selectedNetwork]);

  const handleAuthorize = useCallback(async () => {
    if (!isConnected || !address || !chainId || !selectedToken) {
      onError?.('Please connect your wallet and select a token');
      return;
    }

    setButtonState('approving');

    try {
      // Get chain configuration using the new consolidated approach
      const chainConfig = findChainConfigByChainId(chainId);
      if (!chainConfig) {
        throw new Error('Unsupported network');
      }

      // Get token configuration
      const networkTokens = chainConfig.tokens;
      if (!networkTokens) {
        throw new Error('Unsupported network');
      }

      // Find token config by symbol (case-insensitive)
      const tokenConfig = Object.values(networkTokens).find(
        token => token.symbol.toLowerCase() === selectedToken.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error('Unsupported token');
      }

      // Get payment option for selected token
      const paymentOption = paymentOptions.find(option => option.token === selectedToken);
      if (!paymentOption) {
        throw new Error('Payment option not found for selected token');
      }

      const networkContracts = chainConfig.contracts;
      if (!networkContracts) {
        throw new Error('Network contracts not found');
      }

      // Create provider and signer
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Validate signer is available and has correct address
      if (!signer) {
        throw new Error('Failed to get wallet signer');
      }
      
      const signerAddress = await signer.getAddress();
      if (!signerAddress) {
        throw new Error('Signer has no address');
      }
      
      // Verify signer address matches connected address
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signer address mismatch with connected wallet');
      }

      // Create token contract instance
      const tokenContract = new ethers.Contract(
        tokenConfig.address,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
          'function allowance(address owner, address spender) external view returns (uint256)',
        ],
        signer
      );

      // Check if approval is needed
      const allowance = await tokenContract.allowance(address, networkContracts.DERAMP_PROXY);
      const requiredAmount = ethers.parseUnits(paymentOption.amount, tokenConfig.decimals);

      if (allowance < requiredAmount) {
        // Approve token
        const approveTx = await tokenContract.approve(
          networkContracts.DERAMP_PROXY,
          requiredAmount
        );
        await approveTx.wait();
      }

      setButtonState('confirm');
    } catch (error) {
      // Always reset to ready state to prevent freezing
      setButtonState('ready');
      
      // Provide user-friendly error messages
      let userMessage = t.payment?.tokenAuthFailed || 'Token authorization failed';
      
      if (error instanceof Error) {
        if (error.message.includes('Unsupported token')) {
          userMessage = t.payment?.tokenNotSupported || 'Token not supported';
        } else if (error.message.includes('Unsupported network')) {
          userMessage = t.payment?.networkNotSupported || 'Network not supported';
        } else if (error.message.includes('No Ethereum provider found')) {
          userMessage = t.payment?.walletNotFound || 'Wallet not found';
        } else if (error.message.includes('Payment option not found')) {
          userMessage = t.payment?.paymentOptionNotFound || 'Payment option not found';
        } else if (error.message.includes('Failed to get wallet signer')) {
          userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
        } else if (error.message.includes('Signer has no address')) {
          userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
        } else if (error.message.includes('Signer address mismatch')) {
          userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
        } else if (error.message.includes('could not coalesce')) {
          userMessage = t.payment?.networkCongestion || 'Network is congested. Please try again in a few minutes.';
        } else if (error.message.includes('gas') && error.message.includes('limit')) {
          userMessage = t.payment?.gasError || 'Gas configuration error. Please try again.';
        } else if (error.message.includes('nonce')) {
          userMessage = t.payment?.nonceError || 'Transaction nonce error. Please try again.';
        } else if (error.message.includes('timeout') || error.message.includes('deadline')) {
          userMessage = t.payment?.networkCongestion || 'Network is congested. Please try again in a few minutes.';
        } else {
          // Use the original error message for unknown errors
          userMessage = error.message || t.payment?.tokenAuthFailed || 'Token authorization failed';
        }
      }
      
      onError?.(userMessage);
    }
  }, [selectedToken, paymentOptions, isConnected, address, chainId, onError, t.payment]);

  const handleConfirm = useCallback(async () => {
    if (!isConnected || !address || !chainId || !selectedToken) {
      onError?.('Please connect your wallet and select a token');
      return;
    }

    setButtonState('processing');

    try {
      // Get chain configuration using the new consolidated approach
      const chainConfig = findChainConfigByChainId(chainId);
      if (!chainConfig) {
        throw new Error('Unsupported network');
      }
      
      // Get token configuration
      const networkTokens = chainConfig.tokens;
      if (!networkTokens) {
        throw new Error('Unsupported network');
      }

      // Find token config by symbol (case-insensitive)
      const tokenConfig = Object.values(networkTokens).find(
        token => token.symbol.toLowerCase() === selectedToken.toLowerCase()
      );
      if (!tokenConfig) {
        throw new Error('Unsupported token');
      }

      // Get payment option for selected token
      const paymentOption = paymentOptions.find(option => option.token === selectedToken);
      if (!paymentOption) {
        throw new Error('Payment option not found for selected token');
      }

      const networkContracts = chainConfig.contracts;
      if (!networkContracts) {
        throw new Error('Network contracts not found');
      }

      // Create provider and signer
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found');
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Validate signer is available and has correct address
      if (!signer) {
        throw new Error('Failed to get wallet signer');
      }
      
      const signerAddress = await signer.getAddress();
      if (!signerAddress) {
        throw new Error('Signer has no address');
      }
      
      // Verify signer address matches connected address
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signer address mismatch with connected wallet');
      }

      // Import the full ABI from the JSON file
      const derampProxyAbi = (await import('../blockchain/abi/DerampProxy.json')).abi;
      
      // Create DerampProxy contract instance with full ABI
      const derampProxyContract = new ethers.Contract(
        networkContracts.DERAMP_PROXY,
        derampProxyAbi,
        signer
      );

      // Convert invoiceId to bytes32 using ethers.id (same as backend)
      const invoiceIdBytes32 = ethers.id(invoiceId);
      
      // IMPORTANTE: Obtener la cantidad exacta del blockchain, no de la BD
      // La BD se actualiza cada 5 minutos, pero el smart contract espera la cantidad original
      const statusCheck = await BlockchainService.getStatus(invoiceId, chainId);
      
      if (!statusCheck.success) {
        throw new Error('Failed to get blockchain status');
      }
      
      if (!statusCheck.data.exists) {
        // Invoice doesn't exist on blockchain, create it
        const blockchainPaymentOptions = paymentOptions.map(option => {
          const tokenConfig = Object.values(chainConfig.tokens).find(
            t => t.symbol.toLowerCase() === option.token.toLowerCase()
          );
          return {
            token: option.token,
            amount: option.amount,
            decimals: tokenConfig?.decimals || 18,
          };
        });
        
        const createResponse = await BlockchainService.createInvoice({
          invoiceId,
          paymentOptions: blockchainPaymentOptions,
          chainId: chainId,
        });
        
        if (!createResponse.success) {
          throw new Error('Failed to create invoice on blockchain');
        }
        
        // After creating, get the status again to get the exact amounts
        const newStatusCheck = await BlockchainService.getStatus(invoiceId, chainId);
        if (!newStatusCheck.success || !newStatusCheck.data.exists) {
          throw new Error('Invoice creation failed');
        }
      }
      
      // Get the exact amount from blockchain status
      const blockchainPaymentOptions = statusCheck.data.paymentOptions;
      if (!blockchainPaymentOptions || blockchainPaymentOptions.length === 0) {
        throw new Error('No payment options found in blockchain status');
      }
      
      // Find the selected token in blockchain options
      const blockchainOption = blockchainPaymentOptions.find(option => 
        option.token.toLowerCase() === tokenConfig.address.toLowerCase()
      );
      
      if (!blockchainOption) {
        throw new Error(`Token ${selectedToken} (${tokenConfig.address}) not found in blockchain payment options`);
      }
      
      // Use the EXACT amount from blockchain, not from database
      const exactAmount = blockchainOption.amount;
      
      // Parse amount to wei using the EXACT amount from blockchain
      const amount = ethers.parseUnits(exactAmount, tokenConfig.decimals);

      // Check if invoice exists first by calling a view function
      try {
        await derampProxyContract.getStatus(invoiceIdBytes32);
      } catch (error: any) {
        // If getStatus fails, the invoice might not exist
        if (statusCheck.data.status !== 'pending') {
          throw new Error(`Invoice is not in pending status: ${statusCheck.data.status}`);
        }
        
        // Check allowance again before payment
        const tokenContract = new ethers.Contract(
          tokenConfig.address,
          [
            'function allowance(address owner, address spender) external view returns (uint256)',
          ],
          provider
        );
        
        const allowance = await tokenContract.allowance(address, networkContracts.DERAMP_PROXY);
        
        if (allowance < amount) {
          throw new Error('Insufficient allowance. Please approve tokens first.');
        }
      }

      const payTx = await derampProxyContract.payInvoice(
        invoiceIdBytes32,
        tokenConfig.address,
        amount,
        { value: 0 } // No ETH value needed for token payments
      );

      // Wait for transaction confirmation
      const receipt = await payTx.wait();
      
      if (receipt.status === 1) {
        // Transaction successful
        const paymentData = {
          paid_token: selectedToken,
          paid_network: chainConfig.chain.name,
          paid_tx_hash: payTx.hash,
          wallet_address: address,
          paid_amount: parseFloat(paymentOption.amount),
          reason: 'Payment completed successfully'
        };

        // Update payment data in backend (this also sets status to "paid")
        await BlockchainService.updatePaymentData(invoiceId, paymentData);
        
        // Success!
        setButtonState('initial');
        setSelectedToken('');
        onSuccess?.();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: any) {
      setButtonState('confirm');
      
      // Check if user cancelled the transaction
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        onPaymentCancelled?.();
      } else {
        // Provide user-friendly error messages
        let userMessage = t.payment?.paymentFailed || 'Payment failed';
        
        if (error.message) {
          if (error.message.includes('insufficient allowance')) {
            userMessage = t.payment?.tokenAuthRequired || 'Token authorization required';
          } else if (error.message.includes('transaction execution reverted')) {
            userMessage = t.payment?.transactionFailed || 'Transaction failed';
          } else if (error.message.includes('insufficient balance')) {
            userMessage = t.payment?.insufficientBalance || 'Insufficient balance';
          } else if (error.message.includes('network')) {
            userMessage = t.payment?.networkIssue || 'Network issue';
          } else if (error.message.includes('Failed to fetch')) {
            userMessage = t.payment?.connectionIssue || 'Connection issue';
          } else if (error.message.includes('Failed to get wallet signer')) {
            userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
          } else if (error.message.includes('Signer has no address')) {
            userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
          } else if (error.message.includes('Signer address mismatch')) {
            userMessage = t.payment?.connectionIssue || 'Wallet connection issue. Please reconnect.';
          } else if (error.message.includes('could not coalesce')) {
            userMessage = t.payment?.networkCongestion || 'Network is congested. Please try again in a few minutes.';
          } else if (error.message.includes('gas') && error.message.includes('limit')) {
            userMessage = t.payment?.gasError || 'Gas configuration error. Please try again.';
          } else if (error.message.includes('nonce')) {
            userMessage = t.payment?.networkCongestion || 'Network is congested. Please try again in a few minutes.';
          } else if (error.message.includes('timeout') || error.message.includes('deadline')) {
            userMessage = t.payment?.networkCongestion || 'Network is congested. Please try again in a few minutes.';
          } else {
            // Use the original error message for unknown errors
            userMessage = error.message || t.payment?.tokenAuthFailed || 'Token authorization failed';
          }
        }
        
        onError?.(userMessage);
      }
    }
  }, [selectedToken, paymentOptions, isConnected, address, chainId, onError, onSuccess, t.payment, onPaymentCancelled, selectedTokenNetwork]);

  const handleButtonClick = useCallback(() => {
    switch (buttonState) {
      case 'initial':
        handlePayNow();
        break;
      case 'ready':
        handleAuthorize();
        break;
      case 'confirm':
        handleConfirm();
        break;
      default:
        // Do nothing for loading/approving/processing states
        break;
    }
  }, [buttonState, handlePayNow, handleAuthorize, handleConfirm]);

  const isButtonDisabled = buttonState === 'loading' || buttonState === 'approving' || buttonState === 'processing';

  // Auto-recovery mechanism to prevent button state from getting stuck
  // This useEffect is removed as per the edit hint to revert to simple reset.

  // Additional safety: reset state if wallet disconnects
  // This useEffect is removed as per the edit hint to revert to simple reset.

  return {
    buttonState,
    buttonText: getButtonText(buttonState, selectedToken),
    isButtonDisabled,
    handleButtonClick,
    selectedToken,
  };
}; 