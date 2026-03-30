/**
 * Withdraw Modal Component
 * Allows recipients to withdraw their balance to crypto wallet or bank account
 */

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, Building2, Loader2 } from "lucide-react"
import { getNetworkByChainId } from "@/blockchain/networks"
import { useToast } from "@/hooks/use-toast"

interface WithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currency: string
  symbol: string
  balance: string
  tokenAddress: string
  chainId: number
}

export function WithdrawModal({
  open,
  onOpenChange,
  currency,
  symbol,
  balance,
  tokenAddress,
  chainId,
}: WithdrawModalProps) {
  const { toast } = useToast()
  const [withdrawing, setWithdrawing] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [amount, setAmount] = useState("")

  const handleWithdrawToCrypto = async () => {
    // Validate inputs
    if (!walletAddress || !amount) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter both wallet address and amount",
      })
      return
    }

    const numAmount = parseFloat(amount)
    const numBalance = parseFloat(balance)

    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid amount",
      })
      return
    }

    if (numAmount > numBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient balance",
        description: `You only have ${symbol}${balance} ${currency} available`,
      })
      return
    }

    // TODO: Implement actual withdrawal logic
    setWithdrawing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Withdrawal initiated",
        description: `${symbol}${amount} ${currency} is being sent to your wallet`,
      })
      
      onOpenChange(false)
      setWalletAddress("")
      setAmount("")
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Withdrawal failed",
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setWithdrawing(false)
    }
  }

  const handleMaxAmount = () => {
    setAmount(balance)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Withdraw {currency}</DialogTitle>
          <DialogDescription>
            Available balance: {symbol}{balance} {currency}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto">
              <Wallet className="w-4 h-4 mr-2" />
              Crypto Wallet
            </TabsTrigger>
            <TabsTrigger value="bank" disabled>
              <Building2 className="w-4 h-4 mr-2" />
              Bank Account
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="outline"
                  onClick={handleMaxAmount}
                  className="cursor-pointer"
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the amount you want to withdraw
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet Address</Label>
              <Input
                id="wallet"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The recipient wallet address on {getNetworkByChainId(chainId)?.name || "Unknown Network"}
              </p>
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Double-check the wallet address</li>
                <li>Make sure it supports {currency} tokens</li>
                <li>Withdrawals are irreversible</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 mt-4">
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Bank Withdrawals Coming Soon</h3>
              <p className="text-sm text-muted-foreground">
                We're working on adding bank account withdrawals. Stay tuned!
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={withdrawing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdrawToCrypto}
            disabled={withdrawing || !walletAddress || !amount}
            className="cursor-pointer"
          >
            {withdrawing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {withdrawing ? "Processing..." : "Withdraw"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

