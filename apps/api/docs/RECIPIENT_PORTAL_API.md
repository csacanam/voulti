# 🎯 Recipient Portal API - Frontend Integration

API endpoints for the recipient portal that frontend developers need to integrate.

---

## 📡 API Endpoints

### 1. Get Public Payout Details

```http
GET /api/payouts/:id/public
```

**Auth**: None (public endpoint)

**Response** (200):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 100.0,
  "currency": "COP",
  "from_commerce": {
    "id": "commerce-uuid",
    "name": "Acme Corporation"
  },
  "status": "Funded",
  "created_at": "2024-10-21T10:30:00Z",
  "claimed_at": null,
  "recipient_email": "u***@example.com"
}
```

**Error Responses**:

- `404`: Payout not found
- `400`: Missing payout ID

---

### 2. Initialize Recipient (Bind Wallet)

```http
POST /api/recipients/initialize
```

**Auth**: Required (Bearer token from Privy)
**Header**: `Authorization: Bearer <privy_token>`

**Request Body**: None (email and wallet from token)

**Response** (200):

```json
{
  "success": true,
  "email": "user@example.com",
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "payouts_bound": 3
}
```

**Error Responses**:

- `401`: Invalid or expired token
- `401`: Missing email or wallet in token
- `500`: Database error

---

### 3. Get Recipient Funded Payouts

```http
GET /api/recipients/payouts
```

**Auth**: Required (Bearer token from Privy)

**Description**: Returns only payouts with status "Funded" (ready to claim)

**Response** (200):

```json
{
  "payouts": [
    {
      "id": "168c6b28-0a88-4b51-aada-45cfedc7d898",
      "amount": 100.0,
      "currency": "COP",
      "from_commerce": {
        "id": "c3a1a341-5d03-4d20-ab35-eeef1c9c897d",
        "name": "Peewah"
      },
      "status": "Funded",
      "created_at": "2025-10-24T00:53:34.823461+00:00"
    }
  ]
}
```

**Error Responses**:

- `401`: Invalid or expired token
- `500`: Server error

---

### 4. Claim Payout

```http
POST /api/payouts/:id/claim
```

**Auth**: Not required (security via wallet binding)

**Request Body**: None

**Description**: Claims a payout by calling the vault contract's `withdrawFor` function. This transfers the funds from the vault to the recipient's wallet.

**Response** (200):

```json
{
  "success": true,
  "payout": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.0,
    "currency": "COP",
    "status": "Claimed",
    "claimed_at": "2024-10-23T16:45:00Z"
  }
}
```

**Error Responses**:

- `404`: Payout not found
- `409`: Payout already claimed
- `422`: Payout not funded yet
- `422`: Wallet not bound yet
- `422`: Insufficient funds in vault
- `400`: Transaction rejected by user
- `500`: Claim failed

---

## 🔄 Payout Status Flow

```
Created  → Payout created, waiting for funds
   ↓
Funded   → Vault received Deposit event
   ↓
Claimed  → Recipient claimed, funds in their wallet
```

---

## 💻 Frontend Integration Examples

### JavaScript/TypeScript

```typescript
// 1. Get public payout details
const getPayoutDetails = async (payoutId: string) => {
  const response = await fetch(`/api/payouts/${payoutId}/public`);
  return await response.json();
};

// 2. Get recipient's payouts
const getRecipientPayouts = async (privyToken: string) => {
  const response = await fetch("/api/recipients/payouts", {
    headers: {
      Authorization: `Bearer ${privyToken}`,
    },
  });
  return await response.json();
};

// 3. Initialize recipient (call on every login)
const initializeRecipient = async (privyToken: string) => {
  const response = await fetch("/api/recipients/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${privyToken}`,
    },
  });
  return await response.json();
};

// 4. Claim payout
const claimPayout = async (payoutId: string) => {
  const response = await fetch(`/api/payouts/${payoutId}/claim`, {
    method: "POST",
  });
  return await response.json();
};
```

### React Hook Examples

```typescript
import { useState, useEffect } from "react";

// Hook for single payout details
export const usePayout = (payoutId: string) => {
  const [payout, setPayout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayout = async () => {
      try {
        const data = await getPayoutDetails(payoutId);
        setPayout(data);
      } catch (error) {
        console.error("Failed to fetch payout:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayout();
  }, [payoutId]);

  return { payout, loading };
};

// Hook for recipient's payouts list
export const useRecipientPayouts = (privyToken: string) => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const data = await getRecipientPayouts(privyToken);
        setPayouts(data.payouts || []);
      } catch (error) {
        console.error("Failed to fetch payouts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (privyToken) {
      fetchPayouts();
    }
  }, [privyToken]);

  return { payouts, loading };
};
```

---

**Last Updated**: October 2024
