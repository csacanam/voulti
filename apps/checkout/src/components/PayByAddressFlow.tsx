import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Shield, Clock, Smartphone } from 'lucide-react';
import { NetworkSelector } from './NetworkSelector';
import { QRCodeComponent } from './QRCode';
import { depositService, type DepositData } from '../services/depositService';
import { useDepositPolling } from '../hooks/useDepositPolling';
import { findChainConfigByChainId, SUPPORTED_CHAINS } from '../config/chains';
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
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors py-2 -ml-1 px-1 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to payment methods
      </button>

      {!deposit ? (
        /* ──────── Step 1: Select network + token ──────── */
        <div className="space-y-4">
          <NetworkSelector selectedChainId={selectedChainId} onSelect={handleNetworkSelect} />

          {selectedChainId && availableTokens.length > 0 && (
            <div className="space-y-2">
              <label className="block text-white font-medium">Select Token</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableTokens.map(token => (
                    <button
                      key={token.symbol}
                      onClick={() => handleTokenSelect(token)}
                      className={`p-4 rounded-lg text-left transition-all border min-h-[56px] ${
                        selectedToken?.symbol === token.symbol
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600 active:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-white">{token.symbol}</div>
                      {token.amount_to_pay && (
                        <div className="text-sm text-gray-400">{token.amount_to_pay} {token.symbol}</div>
                      )}
                    </button>
                ))}
              </div>
            </div>
          )}

          {selectedChainId && availableTokens.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No tokens available on this network for this invoice.</p>
          )}

          {/* Pre-generation confirmation with warning */}
          {selectedToken && selectedToken.amount_to_pay && (
            <div className="space-y-3">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">You will send</p>
                <p className="text-xl font-bold text-white">
                  {selectedToken.amount_to_pay} {selectedToken.symbol}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  on <span className="text-purple-400 font-medium">{networkName}</span>
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-amber-300">Before you continue</span>
                </div>
                <ul className="text-sm text-amber-200/80 space-y-2 ml-6">
                  <li>Send <strong className="text-amber-200">{selectedToken.symbol}</strong> only, not another token</li>
                  <li>Send on the <strong className="text-amber-200">{networkName}</strong> network</li>
                  <li>Send the <strong className="text-amber-200">exact amount</strong> — sending less will not complete the payment</li>
                  <li>If you send more, the excess will be automatically refunded</li>
                </ul>
              </div>

              <button
                onClick={handleGenerateAddress}
                disabled={loading}
                className="w-full py-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[56px] active:bg-purple-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating address...
                  </>
                ) : (
                  'I understand, generate address'
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">{error}</div>
          )}
        </div>
      ) : (
        /* ──────── Step 2: Deposit address + status ──────── */
        <div className="space-y-4">

          {/* ── Status banners ── */}
          {depositStatus === 'partial' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Partial deposit received</span>
              </div>
              {detectedAmount && (
                <p className="text-sm text-amber-200/80 ml-6">
                  Received <strong>{detectedAmount}</strong> of <strong>{deposit.expectedAmount}</strong> {deposit.tokenSymbol}.
                  Please send the remaining <strong>{(parseFloat(deposit.expectedAmount) - parseFloat(detectedAmount)).toFixed(6)}</strong> {deposit.tokenSymbol}.
                </p>
              )}
            </div>
          )}

          {(depositStatus === 'detected' || depositStatus === 'sweeping') && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Loader2 className="w-5 h-5 animate-spin text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-300">Deposit received!</p>
                <p className="text-sm text-green-400/80">Processing your payment...</p>
              </div>
            </div>
          )}

          {(depositStatus === 'swept' || invoiceStatus === 'Paid') && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-300">Payment complete!</p>
                <p className="text-sm text-green-400/80">Your payment has been confirmed.</p>
              </div>
            </div>
          )}

          {depositStatus === 'refunded' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-300">Invoice expired</p>
                <p className="text-sm text-blue-400/80">Your deposit has been automatically refunded.</p>
              </div>
            </div>
          )}

          {depositStatus === 'failed' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-300">Something went wrong</p>
                <p className="text-sm text-red-400/80">Please contact support for assistance.</p>
              </div>
            </div>
          )}

          {/* ── Payment details (hide after terminal state) ── */}
          {!isTerminal && (
            <>
              {/* Network + Token badges */}
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs font-medium text-purple-300">
                  {networkName}
                </span>
                <span className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-full text-xs font-medium text-gray-300">
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
                <div className="flex items-center justify-center gap-2 py-2 text-gray-500">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs">Copy the address below and paste it in your wallet app</span>
                </div>
              )}

              {/* Amount — large and tappable copy */}
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Send exactly</p>
                <button
                  onClick={() => copyToClipboard(deposit.expectedAmount, 'amount')}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 active:bg-gray-700 transition-all min-h-[48px]"
                  title="Tap to copy amount"
                >
                  <span className="text-2xl font-bold text-white">{deposit.expectedAmount}</span>
                  <span className="text-lg text-gray-400">{deposit.tokenSymbol}</span>
                  {copied === 'amount' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {copied === 'amount' && (
                  <p className="text-xs text-green-400 mt-1">Amount copied!</p>
                )}
              </div>

              {/* Address — full width tappable copy */}
              <button
                onClick={() => copyToClipboard(deposit.address, 'address')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 active:bg-gray-700 transition-all text-left group min-h-[72px]"
                title="Tap to copy address"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">Deposit address</p>
                  <span className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300">
                    {copied === 'address' ? (
                      <><Check className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Tap to copy</>
                    )}
                  </span>
                </div>
                <code className="text-sm text-gray-300 break-all font-mono leading-relaxed select-all">
                  {deposit.address}
                </code>
              </button>

              {/* Checklist */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Double check before sending</p>
                <div className="space-y-3">
                  {[
                    <>Sending <strong className="text-white">{deposit.tokenSymbol}</strong> (not another token)</>,
                    <>On the <strong className="text-white">{networkName}</strong> network</>,
                    <>Amount is exactly <strong className="text-white">{deposit.expectedAmount} {deposit.tokenSymbol}</strong></>,
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border border-amber-500/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] text-amber-400">!</span>
                      </div>
                      <p className="text-sm text-gray-400">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Awaiting indicator */}
              {(!depositStatus || depositStatus === 'awaiting') && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Waiting for your deposit...</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
