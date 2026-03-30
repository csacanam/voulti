# Privy Token Usage Guide

## Overview

Privy provides authentication tokens that the frontend must send to the backend. The backend validates these tokens and extracts:
- User's **email address**
- User's **wallet address**

---

## Frontend: Getting the Token

### 1. Install Hook

Use the `usePrivyToken` hook:

```typescript
import { usePrivyToken } from "@/hooks/use-privy-token"

function MyComponent() {
  const { getToken, authenticated } = usePrivyToken()
  
  const handleAction = async () => {
    if (!authenticated) {
      console.error("User not logged in")
      return
    }
    
    // Get token
    const token = await getToken()
    if (!token) {
      console.error("Failed to get token")
      return
    }
    
    // Send to backend
    await recipientService.initialize(token)
  }
  
  return <button onClick={handleAction}>Initialize</button>
}
```

### 2. Service Usage

The `recipientService` already handles token injection:

```typescript
import { recipientService } from "@/services"
import { usePrivyToken } from "@/hooks/use-privy-token"

// In your component
const { getToken } = usePrivyToken()

// Initialize recipient (binds wallet to payouts)
const token = await getToken()
await recipientService.initialize(token)
```

---

## Backend: Validating the Token

### 1. Install Privy SDK

```bash
npm install @privy-io/server-auth
```

### 2. Set Environment Variables

```bash
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret  # Get from Privy Dashboard > Settings > API
```

### 3. Create Middleware

```typescript
import { PrivyClient } from "@privy-io/server-auth"

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  
  if (!token) {
    return res.status(401).json({ error: "No token provided" })
  }

  try {
    // Validate token and get user data
    const user = await privy.verifyAuthToken(token)
    
    // Extract email and wallet
    req.user = {
      email: user.email?.address,
      wallet: user.wallet?.address,
    }
    
    next()
  } catch (error) {
    console.error("Token validation failed:", error)
    res.status(401).json({ error: "Invalid token" })
  }
}
```

### 4. Use in Routes

```typescript
app.post("/api/recipients/initialize", authMiddleware, async (req, res) => {
  // req.user.email and req.user.wallet are now available
  const { email, wallet } = req.user
  
  console.log("User:", email, wallet)
  
  // ... rest of your logic
})
```

---

## Security Notes

1. **Token Expiration**: Privy tokens expire. Frontend should handle `401` errors and prompt re-login.

2. **HTTPS Only**: In production, always use HTTPS to prevent token interception.

3. **Validate on Every Request**: Never trust client-provided email/wallet - always validate the token.

4. **Secret Protection**: Keep `PRIVY_APP_SECRET` secure - never expose it in frontend code.

---

## Example: Full Flow

### Frontend

```typescript
"use client"

import { useState } from "react"
import { usePrivy } from "@privy-io/react-auth"
import { usePrivyToken } from "@/hooks/use-privy-token"
import { recipientService } from "@/services"

export default function ClaimPage() {
  const { login, authenticated } = usePrivy()
  const { getToken } = usePrivyToken()
  const [status, setStatus] = useState("")

  const handleClaim = async () => {
    // 1. Check auth
    if (!authenticated) {
      await login()
      return
    }

    // 2. Get token
    setStatus("Getting auth token...")
    const token = await getToken()
    if (!token) {
      setStatus("Failed to get token")
      return
    }

    // 3. Initialize (bind wallet)
    setStatus("Binding wallet to payout...")
    await recipientService.initialize(token)

    // 4. Claim (no auth needed)
    setStatus("Claiming payout...")
    await recipientService.claimPayout("payout-id")
    
    setStatus("Success!")
  }

  return (
    <div>
      <button onClick={handleClaim}>Claim Payout</button>
      <p>{status}</p>
    </div>
  )
}
```

### Backend

```typescript
import { PrivyClient } from "@privy-io/server-auth"
import express from "express"

const app = express()
const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Auth middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")
  
  try {
    const user = await privy.verifyAuthToken(token)
    req.user = {
      email: user.email?.address,
      wallet: user.wallet?.address,
    }
    next()
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" })
  }
}

// Initialize endpoint
app.post("/api/recipients/initialize", authMiddleware, async (req, res) => {
  const { email, wallet } = req.user
  
  // Bind wallet to payouts for this email
  const result = await db.payouts.updateMany(
    { to_email: email, to_address: null, status: "Funded" },
    { to_address: wallet }
  )
  
  res.json({
    success: true,
    email,
    wallet_address: wallet,
    payouts_bound: result.count,
  })
})

// Claim endpoint (no auth)
app.post("/api/payouts/:id/claim", async (req, res) => {
  const payout = await db.payouts.findById(req.params.id)
  
  // Validate
  if (!payout || payout.status !== "Funded" || payout.claimed_at) {
    return res.status(422).json({ error: "Cannot claim" })
  }
  
  // Execute withdrawFor
  // ... (see BACKEND_RECIPIENT_API.md for full implementation)
  
  res.json({ success: true })
})
```

---

## Troubleshooting

### "Failed to get token"

- Check user is authenticated: `authenticated === true`
- Check Privy is initialized: `NEXT_PUBLIC_PRIVY_APP_ID` is set
- Check browser console for errors

### "Invalid token" (401 from backend)

- Check `PRIVY_APP_SECRET` matches your app in Privy Dashboard
- Check token is sent in `Authorization: Bearer <token>` header
- Token may have expired - prompt user to re-login

### "Email or wallet is undefined"

- User may not have email linked - check `user.email?.address`
- User may not have wallet created - check `user.wallet?.address`
- In Privy config, ensure `createOnLogin: "users-without-wallets"`

---

**Last Updated**: October 2025

