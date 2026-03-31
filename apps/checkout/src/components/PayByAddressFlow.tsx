import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Shield, Clock, Smartphone } from 'lucide-react';
import { NetworkSelector } from './NetworkSelector';
import { QRCodeComponent } from './QRCode';
import { depositService, type DepositData } from '../services/depositService';
import { useDepositPolling } from '../hooks/useDepositPolling';
import { findChainConfigByChainId, SUPPORTED_CHAINS } from '../config/chains';
import { useLanguage } from '../contexts/LanguageContext';
import { interpolate } from '../utils/i18n';
import type { Invoice, Token } from '../types/invoice';

interface PayByAddressFlowProps {
  invoice: Invoice;
  onBack: () => void;
  onSuccess: () => void;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function PayByAddressFlow({ invoice, onBack, onSuccess }: PayByAddressFlowProps) {
  const { t } = useLanguage();
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [deposit, setDeposit] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null);
  const isMobile = useIsMobile();

  // Map chainId to network backend names for filtering
  const selectedNetworkNames = useMemo(() => {
    if (!selectedChainId) return [];
    const config = SUPPORTED_CHAINS.find(c => c.chain.id === selectedChainId);
    return config?.backendNames || [];
  }, [selectedChainId]);

  const availableTokens = useMemo(() => {
    if (!selectedChainId || !invoice.tokens) return [];
    return invoice.tokens.filter(t =>
      selectedNetworkNames.some(name => name.toLowerCase() === t.network.toLowerCase())
    );
  }, [selectedChainId, invoice.tokens, selectedNetworkNames]);

  const { status: depositStatus, detectedAmount, invoiceStatus } = useDepositPolling(
    deposit ? invoice.id : null,
    !!deposit
  );

  if (invoiceStatus === 'Paid' || depositStatus === 'swept') {
    onSuccess();
    return null;
  }

  const handleNetworkSelect = (chainId: number) => {
    setSelectedChainId(chainId);
    setSelectedToken(null);
    setDeposit(null);
    setError(null);
  };

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setDeposit(null);
    setError(null);
  };

  const handleGenerateAddress = async () => {
    if (!selectedToken || !selectedChainId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await depositService.generateAddress({
        invoiceId: invoice.id,
        chainId: selectedChainId,
        tokenAddress: selectedToken.contract_address,
        tokenSymbol: selectedToken.symbol,
        tokenDecimals: selectedToken.decimals || 18,
        expectedAmount: selectedToken.amount_to_pay || '0',
      });
      setDeposit(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'address' | 'amount') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const chainConfig = selectedChainId ? findChainConfigByChainId(selectedChainId) : null;
  const networkName = chainConfig?.chain.name || deposit?.network || '';
  const isTerminal = depositStatus === 'swept' || depositStatus === 'refunded' || depositStatus === 'failed' || invoiceStatus === 'Paid';

  return (
    <div className="space-y-4">
      {/* Back button — proper touch target */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2 -ml-1 px-1 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.payByAddress.back}
      </button>

      {!deposit ? (
        /* -------- Step 1: Select network + token -------- */
        <div className="space-y-4">
          <NetworkSelector selectedChainId={selectedChainId} onSelect={handleNetworkSelect} />

          {selectedChainId && availableTokens.length > 0 && (
            <div className="space-y-2">
              <label className="block text-gray-900 font-medium">{t.payByAddress.selectToken}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableTokens.map(token => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenSelect(token)}
                      className={`p-4 rounded-lg text-left transition-all border min-h-[56px] ${
                        selectedToken?.symbol === token.symbol
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{token.symbol}</div>
                      {token.amount_to_pay && (
                        <div className="text-sm text-gray-500">{token.amount_to_pay} {token.symbol}</div>
                      )}
                    </button>
                ))}
              </div>
            </div>
          )}

          {selectedChainId && availableTokens.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">{t.payByAddress.noTokens}</p>
          )}

          {/* Pre-generation confirmation with warning */}
          {selectedToken && selectedToken.amount_to_pay && (
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">{t.payByAddress.youWillSend}</p>
                <p className="text-xl font-bold text-gray-900">
                  {selectedToken.amount_to_pay} {selectedToken.symbol}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t.payByAddress.onNetwork} <span className="text-violet-600 font-medium">{networkName}</span>
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-700">{t.payByAddress.beforeContinue}</span>
                </div>
                <ul className="text-sm text-amber-600 space-y-2 ml-6">
                  <li>{t.payByAddress.sendOnly} <strong className="text-amber-700">{selectedToken.symbol}</strong> {t.payByAddress.notAnotherToken}</li>
                  <li>{t.payByAddress.sendOnNetwork} <strong className="text-amber-700">{networkName}</strong></li>
                  <li>{t.payByAddress.sendExactAmount}</li>
                  <li>{t.payByAddress.overpaymentRefund}</li>
                </ul>
              </div>

              <button
                onClick={handleGenerateAddress}
                disabled={loading}
                className="w-full py-4 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[56px] active:bg-violet-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.payByAddress.generating}
                  </>
                ) : (
                  t.payByAddress.understand
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
        </div>
      ) : (
        /* -------- Step 2: Deposit address + status -------- */
        <div className="space-y-4">

          {/* -- Status banners -- */}
          {depositStatus === 'partial' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">{t.payByAddress.partialTitle}</span>
              </div>
              {detectedAmount && (
                <p className="text-sm text-amber-600 ml-6">
                  {interpolate(t.payByAddress.partialDesc, {
                    detected: detectedAmount,
                    expected: deposit.expectedAmount,
                    symbol: deposit.tokenSymbol,
                    remaining: (parseFloat(deposit.expectedAmount) - parseFloat(detectedAmount)).toFixed(6),
                  })}
                </p>
              )}
            </div>
          )}

          {(depositStatus === 'detected' || depositStatus === 'sweeping') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">{t.payByAddress.depositReceived}</p>
                <p className="text-sm text-green-600">{t.payByAddress.processing}</p>
              </div>
            </div>
          )}

          {(depositStatus === 'swept' || invoiceStatus === 'Paid') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">{t.payByAddress.paymentComplete}</p>
                <p className="text-sm text-green-600">{t.payByAddress.paymentConfirmed}</p>
              </div>
            </div>
          )}

          {depositStatus === 'refunded' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-700">{t.payByAddress.invoiceExpired}</p>
                <p className="text-sm text-blue-600">{t.payByAddress.depositRefunded}</p>
              </div>
            </div>
          )}

          {depositStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">{t.payByAddress.somethingWrong}</p>
                <p className="text-sm text-red-600">{t.payByAddress.contactSupport}</p>
              </div>
            </div>
          )}

          {/* -- Payment details (hide after terminal state) -- */}
          {!isTerminal && (
            <>
              {/* Network + Token badges */}
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-full text-xs font-medium text-violet-700">
                  {networkName}
                </span>
                <span className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-medium text-gray-600">
                  {deposit.tokenSymbol}
                </span>
              </div>

              {/* QR Code — only on desktop */}
              {!isMobile && (
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-xl">
                    <QRCodeComponent value={deposit.address} size={180} />
                  </div>
                </div>
              )}

              {/* Mobile hint */}
              {isMobile && (
                <div className="flex items-center justify-center gap-2 py-2 text-gray-400">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs">{t.payByAddress.scanToPayMobile}</span>
                </div>
              )}

              {/* Amount — large and tappable copy */}
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide">{t.payByAddress.sendExactly}</p>
                <button
                  onClick={() => copyToClipboard(deposit.expectedAmount, 'amount')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 active:bg-gray-100 transition-all min-h-[48px]"
                  title={t.payByAddress.tapToCopy}
                >
                  <span className="text-2xl font-bold text-gray-900">{deposit.expectedAmount}</span>
                  <span className="text-lg text-gray-500">{deposit.tokenSymbol}</span>
                  {copied === 'amount' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {copied === 'amount' && (
                  <p className="text-xs text-green-600 mt-1">{t.payByAddress.amountCopied}</p>
                )}
              </div>

              {/* Address — full width tappable copy */}
              <button
                onClick={() => copyToClipboard(deposit.address, 'address')}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 active:bg-gray-100 transition-all text-left group min-h-[72px]"
                title={t.payByAddress.tapToCopy}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-400">{t.payByAddress.depositAddress}</p>
                  <span className="flex items-center gap-1 text-xs text-violet-600 group-hover:text-violet-700">
                    {copied === 'address' ? (
                      <><Check className="w-4 h-4" /> {t.payByAddress.copied}</>
                    ) : (
                      <><Copy className="w-4 h-4" /> {t.payByAddress.tapToCopy}</>
                    )}
                  </span>
                </div>
                <code className="text-sm text-gray-600 break-all font-mono leading-relaxed select-all">
                  {deposit.address}
                </code>
              </button>

              {/* Checklist */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">{t.payByAddress.doubleCheck}</p>
                <div className="space-y-3">
                  {[
                    <>{t.payByAddress.checkToken} <strong className="text-gray-900">{deposit.tokenSymbol}</strong> {t.payByAddress.checkNotAnother}</>,
                    <>{t.payByAddress.checkNetwork} <strong className="text-gray-900">{networkName}</strong></>,
                    <>{t.payByAddress.checkAmount} <strong className="text-gray-900">{deposit.expectedAmount} {deposit.tokenSymbol}</strong></>,
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border border-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] text-amber-600">!</span>
                      </div>
                      <p className="text-sm text-gray-500">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Awaiting indicator */}
              {(!depositStatus || depositStatus === 'awaiting') && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">{t.payByAddress.waiting}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
