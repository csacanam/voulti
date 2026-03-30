import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { usePaymentButton } from '../hooks/usePaymentButton';
import { NetworkCongestionModal } from './NetworkCongestionModal';
import { PaymentCancelledModal } from './PaymentCancelledModal';
import { PaymentOption } from '../blockchain/types';

interface PaymentButtonProps {
  invoiceId: string;
  paymentOptions: PaymentOption[];
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  hasSufficientBalance?: boolean;
  selectedNetwork?: number; // Add selectedNetwork from invoice
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  invoiceId,
  paymentOptions,
  onSuccess,
  onError,
  className = '',
  disabled = false,
  hasSufficientBalance = true,
  selectedNetwork,
}) => {
  const [isCongestionModalOpen, setIsCongestionModalOpen] = useState(false);
  const [isPaymentCancelledModalOpen, setIsPaymentCancelledModalOpen] = useState(false);
  const [congestionMessage, setCongestionMessage] = useState('');

  // Custom error handler that shows modal for network congestion
  const handleError = (error: string) => {
    // Check if it's a network congestion error
    if (error.includes('congested') || error.includes('timeout') || error.includes('deadline') || 
        error.includes('could not coalesce') || error.includes('nonce')) {
      setCongestionMessage(error);
      setIsCongestionModalOpen(true);
    } else {
      // For other errors, use the original onError handler
      onError?.(error);
    }
  };

  // Handle payment cancelled
  const handlePaymentCancelled = () => {
    setIsPaymentCancelledModalOpen(true);
  };

  const {
    buttonState,
    buttonText,
    isButtonDisabled,
    handleButtonClick,
    selectedToken,
  } = usePaymentButton({
    invoiceId,
    paymentOptions,
    onSuccess,
    onError: handleError, // Use our custom error handler
    onPaymentCancelled: handlePaymentCancelled, // Add payment cancelled handler
    hasSufficientBalance,
    selectedNetwork,
  });

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={isButtonDisabled || disabled}
        className={`
          w-full px-4 py-3 font-medium rounded-lg transition-colors flex items-center justify-center space-x-2
          ${disabled || isButtonDisabled 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed hover:bg-gray-600' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          ${className}
        `}
      >
        <Wallet className="h-5 w-5" />
        <span>{buttonText}</span>
      </button>

      {/* Network Congestion Modal */}
      <NetworkCongestionModal
        isOpen={isCongestionModalOpen}
        onClose={() => setIsCongestionModalOpen(false)}
        message={congestionMessage}
      />

      {/* Payment Cancelled Modal */}
      <PaymentCancelledModal
        isOpen={isPaymentCancelledModalOpen}
        onClose={() => setIsPaymentCancelledModalOpen(false)}
      />
    </>
  );
}; 