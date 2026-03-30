import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, AlertCircle } from 'lucide-react';
import { useCommerce } from '../hooks/useCommerce';
import { createInvoice } from '../services/invoiceService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../contexts/LanguageContext';
import { interpolate } from '../utils/i18n';
import { useNavigate } from 'react-router-dom';

export const CommercePage: React.FC = () => {
  const { commerceId } = useParams<{ commerceId: string }>();
  const { commerce, error, loading } = useCommerce(commerceId || '');
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [amountError, setAmountError] = useState<string>('');

  // Update document title when commerce data is available
  useEffect(() => {
    if (commerce) {
      const title = language === 'es' 
        ? `Paga con Cripto en ${commerce.name} - Voulti`
        : `Pay with Crypto at ${commerce.name} - Voulti`;
      document.title = title;
    }
  }, [commerce, language]);



  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    
    // Clear error when user starts typing
    if (amountError) {
      setAmountError('');
    }
    
    // Validate in real-time if there's a value
    if (value && value.trim() !== '') {
      validateAmountRealTime(value);
    }
  };

  const validateAmountRealTime = (value: string) => {
    const numAmount = parseFloat(value);
    
    if (isNaN(numAmount)) {
      setAmountError(t.commerce.amountRequired);
      return false;
    }
    
    if (numAmount <= 0) {
      setAmountError(t.commerce.amountRequired);
      return false;
    }

    // Validate minimum amount if provided by API
    if (commerce?.min_amount && numAmount < commerce.min_amount) {
      setAmountError(interpolate(t.commerce.amountMin, { 
        min: commerce.min_amount.toLocaleString(), 
        currency: `${commerce.currency} ${commerce.currency_symbol}`
      }));
      return false;
    }

    // Validate maximum amount if provided by API
    if (commerce?.max_amount && numAmount > commerce.max_amount) {
      setAmountError(interpolate(t.commerce.amountMax, { 
        max: commerce.max_amount.toLocaleString(), 
        currency: `${commerce.currency} ${commerce.currency_symbol}`
      }));
      return false;
    }

    // Clear error if validation passes
    setAmountError('');
    return true;
  };

  const validateAmount = (): boolean => {
    const numAmount = parseFloat(amount);
    
    if (!amount || amount.trim() === '') {
      setAmountError(t.commerce.amountRequired);
      return false;
    }
    
    if (isNaN(numAmount)) {
      setAmountError(t.commerce.amountRequired);
      return false;
    }
    
    if (numAmount <= 0) {
      setAmountError(t.commerce.amountRequired);
      return false;
    }

    // Validate minimum amount if provided by API
    if (commerce?.min_amount && numAmount < commerce.min_amount) {
      setAmountError(interpolate(t.commerce.amountMin, { 
        min: commerce.min_amount.toLocaleString(), 
        currency: `${commerce.currency} ${commerce.currency_symbol}`
      }));
      return false;
    }

    // Validate maximum amount if provided by API
    if (commerce?.max_amount && numAmount > commerce.max_amount) {
      setAmountError(interpolate(t.commerce.amountMax, { 
        max: commerce.max_amount.toLocaleString(), 
        currency: `${commerce.currency} ${commerce.currency_symbol}`
      }));
      return false;
    }

    // All validations passed
    setAmountError('');
    return true;
  };

  const handleGenerateLink = async () => {
    if (!validateAmount()) return;

    setIsGenerating(true);
    
    try {
      const response = await createInvoice({
        commerce_id: commerceId || '',
        amount_fiat: parseFloat(amount)
      });

      if (response.success && response.data) {
        // Redirect to the invoice page
        navigate(`/checkout/${response.data.id}`);
      } else {
        // Show error message from backend or use default
        const errorMessage = response.error || t.commerce.createInvoiceError;
        setAmountError(errorMessage);
      }
      
    } catch (error) {
      console.error('Error creating invoice:', error);
      setAmountError(t.commerce.networkError);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !commerce) {
    return <ErrorMessage message={error || t.errors.commerceNotFound} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-md mx-auto p-4">
        {/* Language Selector - Top Right */}
        <div className="flex justify-end mb-2">
          <LanguageSelector />
        </div>
        {/* Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-gray-700">
              {commerce.icon_url ? (
                <img 
                  src={commerce.icon_url} 
                  alt={`${commerce.name} logo`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Store className={`h-6 w-6 text-gray-300 ${commerce.icon_url ? 'hidden' : ''}`} />
            </div>
            <div>
              <h1 className="text-white font-medium text-lg">{commerce.name}</h1>
              {(commerce.description_spanish || commerce.description_english) && (
                <p className="text-gray-400 text-sm">
                  {language === 'es' 
                    ? (commerce.description_spanish || commerce.description_english)
                    : (commerce.description_english || commerce.description_spanish)
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="text-left mb-6">
            <h2 className="text-xl font-semibold text-white">
              {interpolate(t.commerce.title, { name: commerce.name })}
            </h2>
          </div>

          {/* Amount Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                {t.commerce.amountLabel} {language === 'es' ? 'en' : 'in'} {commerce.currency}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm font-medium">
                    {commerce.currency} {commerce.currency_symbol || '$'}
                  </span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className={`w-full bg-gray-700 border rounded-lg py-3 pl-16 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    amountError ? 'border-red-500' : 'border-gray-600'
                  }`}
                  min={commerce?.min_amount || 0}
                  max={commerce?.max_amount || undefined}
                  step={0.01}
                />

              </div>
              {amountError && (
                <div className="flex items-center space-x-2 text-red-400 text-sm mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{amountError}</span>
                </div>
              )}
              
              {/* Amount limits info */}
              {(commerce?.min_amount || commerce?.max_amount) && (
                <div className="text-gray-400 text-xs mt-2">
                  {commerce?.min_amount && (
                    <div>{t.commerce.minimum}: {commerce.currency} {commerce.currency_symbol} {commerce.min_amount.toLocaleString()}</div>
                  )}
                  {commerce?.max_amount && (
                    <div>{t.commerce.maximum}: {commerce.currency} {commerce.currency_symbol} {commerce.max_amount.toLocaleString()}</div>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateLink}
              disabled={isGenerating || !amount || !!amountError}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                isGenerating || !amount || !!amountError
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t.commerce.generating}</span>
                </>
              ) : (
                <span>{t.commerce.generateButton}</span>
              )}
            </button>
          </div>

          {/* Supported Tokens Info */}
          {commerce.supported_tokens && commerce.supported_tokens.length > 0 && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="text-white font-medium mb-2">{t.commerce.supportedTokens}:</h3>
              <div className="flex flex-wrap gap-2">
                {commerce.supported_tokens.map((token) => (
                  <span
                    key={token}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Powered by Voulti */}
        <div className="text-center mt-4 pb-4">
          <Link to="/" className="inline-block">
            <p className="text-gray-400 text-sm hover:text-gray-300 transition-colors">
              {t.poweredBy} <span className="font-bold text-white hover:text-blue-400 transition-colors">Voulti</span>
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}; 