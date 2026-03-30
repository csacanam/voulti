"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { recipientService, type PublicPayoutResponse } from "@/services"

interface RecipientContextType {
  initialized: boolean
  loading: boolean
  error: string | null
  payoutsBound: number
  initialize: () => Promise<void>
}

const RecipientContext = createContext<RecipientContextType | undefined>(undefined)

export function RecipientProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payoutsBound, setPayoutsBound] = useState(0)

  // Auto-initialize when user authenticates
  useEffect(() => {
    if (!ready || !authenticated || initialized) {
      return
    }

    const autoInitialize = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = await getAccessToken()
        if (!token) {
          setError("Failed to get authentication token")
          return
        }

        const result = await recipientService.initialize(token)
        setPayoutsBound(result.payouts_bound)
        setInitialized(true)
        
        console.log("✅ Recipient initialized:", {
          email: result.email,
          wallet: result.wallet_address,
          payouts_bound: result.payouts_bound,
        })
      } catch (err) {
        console.error("Failed to initialize recipient:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize"
        
        // Network error - backend not available
        if (errorMessage.includes("Failed to fetch")) {
          setError("Backend not available. Please make sure the backend is running on port 3000.")
          console.warn("⚠️ Backend connection failed. Initialize will be retried on next login.")
        } else {
          setError(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    autoInitialize()
  }, [ready, authenticated, initialized, getAccessToken])

  // Manual initialize function (if needed)
  const initialize = async () => {
    if (!authenticated) {
      throw new Error("User not authenticated")
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        throw new Error("Failed to get authentication token")
      }

      const result = await recipientService.initialize(token)
      setPayoutsBound(result.payouts_bound)
      setInitialized(true)
      
      console.log("✅ Recipient initialized:", result)
    } catch (err) {
      console.error("Failed to initialize recipient:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize")
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <RecipientContext.Provider
      value={{
        initialized,
        loading,
        error,
        payoutsBound,
        initialize,
      }}
    >
      {children}
    </RecipientContext.Provider>
  )
}

export function useRecipient() {
  const context = useContext(RecipientContext)
  if (context === undefined) {
    throw new Error("useRecipient must be used within a RecipientProvider")
  }
  return context
}

