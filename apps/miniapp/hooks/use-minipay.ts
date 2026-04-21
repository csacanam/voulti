"use client"

import { useEffect, useState } from "react"

/**
 * Detect if the mini app is running inside MiniPay (or another injected wallet host).
 *
 * MiniPay injects an EIP-1193 provider on `window.ethereum` with `isMiniPay = true`.
 * https://docs.minipay.xyz/getting-started/testing-your-mini-app
 */
export function useIsMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false)
  const [hasInjected, setHasInjected] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      setChecked(true)
      return
    }
    const eth = (window as any).ethereum
    setHasInjected(!!eth)
    setIsMiniPay(!!eth?.isMiniPay)
    setChecked(true)
  }, [])

  return { isMiniPay, hasInjected, checked }
}
