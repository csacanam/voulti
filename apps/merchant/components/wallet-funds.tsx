"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { useWallets } from "@privy-io/react-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wallet, Send, Fuel, Loader2 } from "lucide-react"
import { API_CONFIG } from "@/services/config"
import { getAuthToken } from "@/services/api"
import { useLanguage } from "@/components/providers/language-provider"
import { getNetworkByChainId } from "@/blockchain/networks"
import { useToast } from "@/hooks/use-toast"

/**
 * Money sitting in the commerce's own wallet, kept apart from the Voulti
 * balance on purpose.
 *
 * They are two pots and only one is Voulti's: a checkout payment is credited
 * inside the settlement contract and leaves by withdrawal, while a transfer
 * sent straight to the address is already where it was going. Summing them
 * would produce a figure no button can act on — half needs withdrawing, half
 * does not.
 *
 * This section exists at all because Voulti mints the wallet. A merchant who
 * signed up with email never chose to have one and has nowhere else to use it,
 * so funds landing here without a way to see or spend them is a trap rather
 * than an omission.
 */

interface WalletBalance {
  network: string
  chainId: number
  symbol: string
  address: string
  decimals: number
  balance: string
  hasGas: boolean
}

const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"]

export function WalletFunds({
  commerceId,
  showAddress = true,
}: {
  commerceId: string
  /** Off where the page already prints the wallet address on its own card. */
  showAddress?: boolean
}) {
  const { t } = useLanguage()
  const { wallets } = useWallets()
  const { toast } = useToast()

  const [balances, setBalances] = useState<WalletBalance[] | null>(null)
  const [address, setAddress] = useState<string>("")
  const [sending, setSending] = useState<string | null>(null)
  const [fuelling, setFuelling] = useState<string | null>(null)
  const [recipient, setRecipient] = useState("")
  const [openFor, setOpenFor] = useState<string | null>(null)

  const auth = async (): Promise<Record<string, string>> => {
    const token = getAuthToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const load = async () => {
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/wallet-balances`, {
        headers: await auth(),
      })
      if (!res.ok) throw new Error()
      const body = await res.json()
      setBalances(body.data.balances)
      setAddress(body.data.wallet)
    } catch {
      setBalances([])
    }
  }

  useEffect(() => { load() }, [commerceId])

  const key = (b: WalletBalance) => `${b.network}:${b.symbol}`

  const getGas = async (b: WalletBalance) => {
    setFuelling(key(b))
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/commerces/${commerceId}/wallet-gas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await auth()) },
        body: JSON.stringify({ network: b.network }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error)
      // Reloading rather than trusting the response: hasGas is computed from
      // the chain, and that is the answer the send button depends on.
      await load()
      toast({ title: body.data.funded ? t.walletFunds.gasSent : t.walletFunds.gasNotNeeded })
    } catch (err: any) {
      toast({ title: err?.message || t.general.requestFailed, variant: "destructive" as const })
    } finally {
      setFuelling(null)
    }
  }

  const send = async (b: WalletBalance) => {
    if (!ethers.isAddress(recipient)) {
      toast({ title: t.walletFunds.badAddress, variant: "destructive" as const })
      return
    }

    setSending(key(b))
    try {
      const wallet = wallets.find(w => w.walletClientType === "privy")
      if (!wallet) throw new Error(t.walletFunds.noWallet)

      await wallet.switchChain(b.chainId)
      const provider = await wallet.getEthereumProvider()
      const signer = await new ethers.BrowserProvider(provider).getSigner()

      const token = new ethers.Contract(b.address, ERC20_ABI, signer)
      // The whole balance: this exists to empty a wallet that received funds by
      // accident, and a partial send just leaves dust needing gas of its own.
      const tx = await token.transfer(recipient, ethers.parseUnits(b.balance, b.decimals))
      await tx.wait()

      toast({ title: t.walletFunds.sent })
      setOpenFor(null)
      setRecipient("")
      await load()
    } catch (err: any) {
      toast({ title: err?.shortMessage || err?.message || t.general.requestFailed, variant: "destructive" as const })
    } finally {
      setSending(null)
    }
  }

  // Nothing in the wallet is the normal case, and an empty card asking about a
  // second balance would only muddy the one that matters.
  if (!balances || balances.length === 0) return null

  return (
    /* Same heading shape as "Payments to withdraw" above. The two sections are
       siblings that must not be confused, and matching their hierarchy is what
       makes the difference between them legible. */
    <div className="space-y-2">
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t.walletFunds.title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t.walletFunds.subtitle}</p>
        {showAddress && (
          <code className="text-xs font-mono text-muted-foreground break-all">{address}</code>
        )}
      </div>

      <Card className="p-4 space-y-2">
        {balances.map((b) => {
          const chain = getNetworkByChainId(b.chainId)
          const busy = sending === key(b) || fuelling === key(b)

          return (
            <div key={key(b)} className="border border-border/50 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-sm font-medium">{b.balance} {b.symbol}</span>
                  <span className="text-xs text-muted-foreground ml-2">{chain?.name || b.network}</span>
                </div>

                {b.hasGas ? (
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}
                    onClick={() => setOpenFor(openFor === key(b) ? null : key(b))}>
                    <Send className="w-3 h-3" /> {t.walletFunds.send}
                  </Button>
                ) : (
                  /* Without native token the merchant cannot move their own
                     money and has no way to obtain any — which is why Voulti
                     covers exactly one transfer rather than explaining how to
                     buy six cents of ETH. */
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={busy}
                    onClick={() => getGas(b)}>
                    {fuelling === key(b) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Fuel className="w-3 h-3" />}
                    {t.walletFunds.getGas}
                  </Button>
                )}
              </div>

              {!b.hasGas && (
                <p className="text-xs text-amber-600">{t.walletFunds.noGas}</p>
              )}

              {openFor === key(b) && b.hasGas && (
                <div className="flex gap-2 items-center flex-wrap pt-1">
                  <Input
                    placeholder="0x…"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="font-mono text-xs flex-1 min-w-[14rem]"
                  />
                  <Button size="sm" onClick={() => send(b)} disabled={sending === key(b)} className="shrink-0">
                    {sending === key(b)
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : t.walletFunds.sendAll.replace("{amount}", `${b.balance} ${b.symbol}`)}
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
