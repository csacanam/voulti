"use client"

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { authService, ApiError, type Commerce } from "@/services"

interface CommerceContextType {
  commerce: Commerce | null
  loading: boolean
  error: string | null
  needsRegistration: boolean
  registerCommerce: (data: { name: string; currency: string }) => Promise<void>
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined)

export function CommerceProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user } = usePrivy()
  const [commerce, setCommerce] = useState<Commerce | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsRegistration, setNeedsRegistration] = useState(false)

  const walletAddress = useMemo(() => user?.wallet?.address, [user?.wallet?.address])

  useEffect(() => {
    if (!ready || !authenticated || !walletAddress) {
      setCommerce(null)
      setNeedsRegistration(false)
      return
    }

    const checkCommerce = async () => {
      setLoading(true)
      setError(null)

      try {
        const commerceData = await authService.getCommerce(walletAddress)
        setCommerce(commerceData)
        setNeedsRegistration(false)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsRegistration(true)
        } else if (err instanceof TypeError && err.message.includes("fetch")) {
          setError("Unable to connect to backend. Please check your connection and try again.")
        } else {
          setError(err instanceof Error ? err.message : "Failed to check commerce")
        }
      } finally {
        setLoading(false)
      }
    }

    checkCommerce()
  }, [ready, authenticated, walletAddress])

  const registerCommerce = async (data: { name: string; currency: string }) => {
    if (!user?.wallet?.address) {
      throw new Error("No wallet address found")
    }

    setLoading(true)
    setError(null)

    try {
      const newCommerce = await authService.registerCommerce({
        wallet: user.wallet.address,
        name: data.name,
        currency: data.currency,
      })

      setCommerce(newCommerce)
      setNeedsRegistration(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error ${err.status}: ${err.message}`)
      } else {
        setError(err instanceof Error ? err.message : "Failed to register commerce")
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <CommerceContext.Provider value={{ commerce, loading, error, needsRegistration, registerCommerce }}>
      {children}
    </CommerceContext.Provider>
  )
}

export function useCommerce() {
  const context = useContext(CommerceContext)
  if (context === undefined) {
    throw new Error("useCommerce must be used within a CommerceProvider")
  }
  return context
}
