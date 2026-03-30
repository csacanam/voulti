# Services Architecture

This document explains how to use the services layer to connect with the backend API.

## 📁 Structure

```
services/
├── config.ts          # API configuration and endpoints
├── api.ts             # HTTP client with error handling
├── auth.service.ts    # Authentication service
└── index.ts           # Central export point
```

## 🔧 Configuration

Environment variables (`.env`):

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 📝 Usage Examples

### Basic Usage

```tsx
import { authService, ApiError } from "@/services";

// Get commerce by wallet
try {
  const commerce = await authService.getCommerce(walletAddress);
  console.log(commerce);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}

// Register commerce
try {
  const newCommerce = await authService.registerCommerce({
    wallet: walletAddress,
    email: "user@example.com",
    name: "My Business",
  });
  console.log(newCommerce);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

### In React Components

```tsx
"use client";

import { useState, useEffect } from "react";
import { authService, ApiError, type CommerceResponse } from "@/services";
import { usePrivy } from "@privy-io/react-auth";

export function MyComponent() {
  const { user } = usePrivy();
  const [commerce, setCommerce] = useState<CommerceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.wallet?.address) return;

    const fetchCommerce = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await authService.getCommerce(user.wallet.address);
        setCommerce(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCommerce();
  }, [user?.wallet?.address]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!commerce) return <div>No commerce found</div>;

  return <div>Welcome, {commerce.name}!</div>;
}
```

### With React Query (Recommended for production)

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { authService } from "@/services";

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ["commerce", walletAddress],
  queryFn: () => authService.getCommerce(walletAddress),
  enabled: !!walletAddress,
});

// Mutation
const mutation = useMutation({
  mutationFn: authService.registerCommerce,
  onSuccess: (data) => {
    console.log("Commerce registered:", data);
  },
  onError: (error) => {
    console.error("Registration failed:", error);
  },
});
```

## 🔐 Error Handling

The API client provides a custom `ApiError` class:

```tsx
import { ApiError } from "@/services";

try {
  await authService.getCommerce(wallet);
} catch (error) {
  if (error instanceof ApiError) {
    // HTTP errors from the API
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`Data:`, error.data);

    // Handle specific status codes
    if (error.status === 404) {
      // Commerce not found
    } else if (error.status === 401) {
      // Unauthorized
    }
  } else {
    // Network or other errors
    console.error("Unexpected error:", error);
  }
}
```

## 🚀 Adding New Services

### 1. Update config.ts

```typescript
export const API_ENDPOINTS = {
  AUTH: {
    /* ... */
  },
  PAYMENTS: {
    CREATE_PAYMENT: "/payments",
    GET_PAYMENT: (id: string) => `/payments/${id}`,
  },
};
```

### 2. Create service file

```typescript
// services/payment.service.ts
import { apiClient } from "./api";
import { API_ENDPOINTS } from "./config";

export interface PaymentData {
  amount: number;
  currency: string;
}

export const paymentService = {
  async createPayment(data: PaymentData) {
    return apiClient.post(API_ENDPOINTS.PAYMENTS.CREATE_PAYMENT, data);
  },

  async getPayment(id: string) {
    return apiClient.get(API_ENDPOINTS.PAYMENTS.GET_PAYMENT(id));
  },
};
```

### 3. Export from index.ts

```typescript
export { paymentService } from "./payment.service";
export type { PaymentData } from "./payment.service";
```

## 🎯 Best Practices

1. **Always handle errors**: Use try-catch or error boundaries
2. **Type everything**: Use TypeScript interfaces for request/response
3. **Use React Query**: For caching and state management (production)
4. **Environment variables**: Never hardcode API URLs
5. **Timeout handling**: Already built-in (30s default)
6. **Loading states**: Always show loading indicators
7. **Error messages**: Show user-friendly error messages

## 📚 API Client Features

- ✅ Automatic JSON parsing
- ✅ Error handling with custom `ApiError`
- ✅ Request timeouts (configurable)
- ✅ Centralized configuration
- ✅ Type-safe endpoints
- ✅ Easy to extend
- ✅ Follows REST conventions

## 🔄 Response Types

Define response types in each service file:

```typescript
export interface CommerceResponse {
  id: string;
  wallet: string;
  email?: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 🧪 Testing

```typescript
import { authService } from "@/services";

// Mock the API client for testing
jest.mock("@/services/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

test("should fetch commerce", async () => {
  const mockCommerce = { id: "1", wallet: "0x123" };
  apiClient.get.mockResolvedValue(mockCommerce);

  const result = await authService.getCommerce("0x123");
  expect(result).toEqual(mockCommerce);
});
```

---

**Last Updated**: October 2025
