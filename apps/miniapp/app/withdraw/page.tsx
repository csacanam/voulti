"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { ethers } from "ethers"
import { ArrowLeft, Loader2, ArrowDown, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { useCommerce } from "@/hooks/use-commerce"
import { PROXY_ADDRESSES, DERAMP_PROXY_ABI, NETWORKS, GAS_THRESHOLDS } from "@/lib/contracts"

interface Balance {
  network: string
  chainId: number
  symbol: string
  balance: string
  decimals: number
  tokenAddress: string
}

export default function WithdrawPage() {
  const router = useRouter()
  const { ready, authenticated, getAccessToken } = usePrivy()
  const { state } = useCommerce()
  const [balances, setBalances] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Balance | null>(null)

  useEffect(() => {
    if (state.status !== "ready") return
    const fetchBalances = async () => {
      try {
        const token = await getAccessToken()
        if (!token) return
        const data = await api.getBalances(state.commerce.commerce_id, token)
        setBalances((data || []).filter((b: Balance) => parseFloat(b.balance) > 0.01))
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchBalances()
  }, [state, getAccessToken])

  if (!ready || !authenticated || state.status !== "ready") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (selected) {
    return <WithdrawForm balance={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Withdraw</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground mb-4">Select a balance to withdraw</p>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : balances.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center text-sm text-muted-foreground border border-border">
            No balances available to withdraw
          </div>
        ) : (
          <div className="space-y-2">
            {balances.map((b) => (
              <button
                key={`${b.network}-${b.symbol}`}
                onClick={() => setSelected(b)}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold">{parseFloat(b.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })} {b.symbol}</p>
                  <p className="text-xs text-muted-foreground capitalize">{b.network}</p>
                </div>
                <ArrowDown className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function WithdrawForm({ balance, onBack }: { balance: Balance; onBack: () => void }) {
  const router = useRouter()
  const { getAccessToken } = usePrivy()
  const { wallets } = useWallets()
  const { state } = useCommerce()
  const [recipient, setRecipient] = useState("")
  const [fee, setFee] = useState<number>(0)
  const [hasGas, setHasGas] = useState<boolean | null>(null)
  const [checkingGas, setCheckingGas] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ netAmount: string; txHash: string } | null>(null)

  const amount = parseFloat(balance.balance)
  const netAmount = hasGas === false ? Math.max(amount - fee, 0) : amount
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient.trim())
  const canSubmit = isValidAddress && netAmount > 0 && !submitting && !checkingGas
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })

  // Check gas + fee on mount
  useEffect(() => {
    const check = async () => {
      setCheckingGas(true)
      const net = NETWORKS[balance.network]
      if (!net) { setHasGas(false); setCheckingGas(false); return }

      try {
        const wallet = wallets.find(w => w.walletClientType === "privy") || wallets[0]
        if (wallet) {
          const provider = new ethers.JsonRpcProvider(net.rpcUrl, { name: net.name, chainId: net.chainId })
          const bal = await provider.getBalance(wallet.address)
          setHasGas(parseFloat(ethers.formatEther(bal)) >= (GAS_THRESHOLDS[balance.network] || 0.001))
        } else {
          setHasGas(false)
        }
      } catch {
        setHasGas(false)
      }

      try {
        const d = await api.getWithdrawFee(balance.symbol)
        setFee(d.fee_token)
      } catch {
        setFee(0)
      }

      setCheckingGas(false)
    }
    check()
  }, [balance.network, balance.symbol, wallets])

  // Direct withdraw — user signs with their wallet (no fee)
  const directWithdraw = async () => {
    const wallet = wallets.find(w => w.walletClientType === "privy") || wallets[0]
    if (!wallet) throw new Error("No wallet found")

    const net = NETWORKS[balance.network]
    if (!net) throw new Error("Network not configured")

    try {
      await wallet.switchChain(net.chainId)
    } catch {
      const wp = await wallet.getEthereumProvider()
      await wp.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${net.chainId.toString(16)}`,
          chainName: net.name,
          nativeCurrency: net.nativeCurrency,
          rpcUrls: [net.rpcUrl],
        }],
      })
      await wallet.switchChain(net.chainId)
    }

    const provider = await wallet.getEthereumProvider()
    const signer = await new ethers.BrowserProvider(provider).getSigner()
    const proxy = new ethers.Contract(PROXY_ADDRESSES[balance.network], DERAMP_PROXY_ABI, signer)
    const parsed = ethers.parseUnits(balance.balance, balance.decimals)
    const tx = await proxy.withdrawTo(balance.tokenAddress, parsed, recipient.trim())
    const receipt = await tx.wait()
    return { netAmount: fmt(amount), txHash: receipt.hash }
  }

  // Gasless withdraw via API (fee charged)
  const gaslessWithdraw = async () => {
    if (state.status !== "ready") throw new Error("Not ready")
    const token = await getAccessToken()
    if (!token) throw new Error("No auth token")
    const data: any = await api.withdrawFor(state.commerce.commerce_id, {
      token_address: balance.tokenAddress,
      amount: balance.balance,
      network: balance.network,
      to: recipient.trim(),
    }, token)
    return { netAmount: data?.net_amount || fmt(netAmount), txHash: data?.tx_hash || "" }
  }

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const r = hasGas ? await directWithdraw() : await gaslessWithdraw()
      setResult(r)
    } catch (err: any) {
      const msg = err?.message || "Withdrawal failed"
      if (err?.code === "ACTION_REJECTED" || msg.includes("rejected")) {
        setError("Transaction cancelled")
      } else if (msg.includes("insufficient funds")) {
        setError(`Insufficient gas on ${balance.network}`)
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8 gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-center">Withdrawal sent</h1>
        <p className="text-muted-foreground text-center text-sm">
          {result.netAmount} {balance.symbol} sent to<br />
          <span className="font-mono text-xs">{recipient.slice(0, 6)}...{recipient.slice(-4)}</span>
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-8 py-3 bg-brand-600 text-white rounded-full font-semibold"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold">Withdraw {balance.symbol}</h1>
      </header>

      <main className="flex-1 flex flex-col px-4 py-6 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Recipient address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            disabled={submitting}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-mono"
          />
        </div>

        <div className="bg-muted rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available</span>
            <span className="font-medium">{fmt(amount)} {balance.symbol}</span>
          </div>
          {hasGas === false && fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-medium text-amber-600">-{fmt(fee)} {balance.symbol}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">You receive</span>
            <span className="font-bold">{fmt(netAmount)} {balance.symbol}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Network</span>
            <span className="capitalize">{balance.network}</span>
          </div>
        </div>

        {netAmount <= 0 && (
          <p className="text-sm text-destructive">Balance too small to cover the withdrawal fee</p>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full mt-auto py-4 bg-brand-600 text-white rounded-2xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : "Withdraw"}
        </button>
      </main>
    </div>
  )
}
