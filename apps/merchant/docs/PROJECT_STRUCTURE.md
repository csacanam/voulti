# 🏗️ Project Structure & Conventions

**Complete guide to the Voulti frontend architecture, organization, and development patterns.**

---

## 📁 Directory Structure

```
frontend/
├── app/                          # Next.js App Router (Pages)
│   ├── layout.tsx               # Root layout (providers, header)
│   ├── page.tsx                 # Home page (dashboard)
│   ├── globals.css              # Global styles and theme
│   │
│   ├── payouts/                 # Payouts section
│   │   └── page.tsx            # Payouts management page
│   │
│   ├── activity/                # Activity section
│   │   └── page.tsx            # Transaction history page
│   │
│   └── receive/                 # Receive section
│       ├── page.tsx            # Receive landing (3 cards)
│       ├── links/              # Payment links
│       │   └── page.tsx
│       ├── commerce-link/      # Commerce checkout link
│       │   └── page.tsx
│       └── developers/         # API & Webhooks
│           └── page.tsx
│
├── components/                   # React Components
│   ├── ui/                      # Primitive components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (50+ components)
│   │
│   ├── providers/               # Context Providers
│   │   ├── privy-provider.tsx  # Auth provider (Privy)
│   │   └── commerce-provider.tsx # Commerce state management
│   │
│   ├── create-payout/           # Multi-step payout flow
│   │   ├── single-payout-form.tsx
│   │   ├── upload-step.tsx
│   │   ├── validation-step.tsx
│   │   └── confirmation-step.tsx
│   │
│   └── Feature Components       # Page-specific components
│       ├── dashboard-header.tsx    # Header with nav
│       ├── main-nav.tsx           # Navigation menu
│       ├── quick-actions.tsx      # Home quick actions
│       ├── home-metrics.tsx       # Home metrics cards
│       ├── recent-activity.tsx    # Recent transactions
│       ├── stats-cards.tsx        # Payout statistics
│       ├── payouts-list.tsx       # Payout table with filters
│       ├── activity-list.tsx      # All transactions table
│       ├── create-payout-dialog.tsx
│       ├── payout-detail-dialog.tsx
│       ├── create-payment-link-dialog.tsx
│       ├── commerce-registration-modal.tsx
│       └── qr-modal.tsx
│
├── services/                     # Backend API Integration
│   ├── config.ts                # API configuration & endpoints
│   ├── api.ts                   # HTTP client (fetch wrapper)
│   ├── auth.service.ts          # Commerce auth service
│   └── index.ts                 # Central exports
│
├── lib/                          # Utilities & Helpers
│   ├── utils.ts                 # Helper functions (cn, etc.)
│   ├── types.ts                 # TypeScript definitions
│   └── dummy-data.ts            # Mock data for development
│
├── hooks/                        # Custom React Hooks
│   ├── use-mobile.ts            # Responsive breakpoint
│   └── use-toast.ts             # Toast notifications
│
├── docs/                         # Documentation
│   ├── PROJECT_STRUCTURE.md     # This file
│   └── FRONTEND_INTEGRATION.md  # Backend API reference
│
├── public/                       # Static Assets
│   └── *.{svg,png,jpg}
│
└── Configuration Files
    ├── package.json             # Dependencies and scripts
    ├── tsconfig.json            # TypeScript config
    ├── next.config.mjs          # Next.js config
    ├── components.json          # shadcn/ui config
    ├── .env                     # Environment variables
    ├── README.md                # Quick start guide
    ├── ENVIRONMENT_VARIABLES.md # Environment setup
    └── docs/                    # Documentation
        ├── ARCHITECTURE.md      # Architecture overview
        ├── SERVICES.md          # Services layer guide
        ├── PROJECT_STRUCTURE.md # This document
        ├── FRONTEND_INTEGRATION.md # Backend API reference
        └── TEMPORARY_CONFIG.md  # Temporary development config
```

---

## 🎯 Core Conventions

### 1. **Routing Convention** (App Router)

#### File-based routing

- Each folder in `app/` is a route segment
- `page.tsx` = publicly accessible page
- `layout.tsx` = shared UI for route segment
- Nested routes use nested folders

#### Examples:

```
app/page.tsx              → /
app/payouts/page.tsx      → /payouts
app/receive/page.tsx      → /receive
app/receive/links/page.tsx → /receive/links
```

#### Current Routes:

- `/` - Home (Quick Actions, Metrics, Recent Activity)
- `/payouts` - Payout management with filters
- `/activity` - All transactions with export
- `/receive` - Landing with 3 options
- `/receive/links` - Payment links management
- `/receive/commerce-link` - Commerce checkout URL
- `/receive/developers` - API documentation (coming soon)

---

### 2. **Component Organization**

#### Rule: Component placement depends on scope

**`/components/ui/`** - Primitive, reusable UI components

- Managed by shadcn/ui (don't edit manually)
- Zero business logic
- Used across entire app
- Examples: Button, Card, Dialog, Input

**`/components/providers/`** - Context providers

- Wrap entire app or sections
- Manage global state
- Examples: PrivyProvider, CommerceProvider

**`/components/[feature]/`** - Feature modules (multi-file)

- When feature needs multiple related files
- Keep related components together
- Example: `create-payout/` has 4 step components

**`/components/*.tsx`** - Feature components (single file)

- Page-specific or section-specific
- Can be used across multiple pages
- Examples: dashboard-header, payouts-list, activity-list

#### Naming Convention:

- **kebab-case** for file names: `dashboard-header.tsx`
- **PascalCase** for component names: `DashboardHeader`
- **camelCase** for functions/variables: `handleSubmit`

---

### 3. **State Management Strategy**

#### Current Approach:

```
Local State (useState)
    ↓
Context (React Context)
    ↓
Backend (fetch via services)
```

#### When to use each:

**`useState`** - Component-local state

```tsx
const [isOpen, setIsOpen] = useState(false);
```

**`useContext` / Custom Hooks** - Shared state across components

```tsx
const { commerce, loading } = useCommerce();
const { authenticated, user } = usePrivy();
```

**Services** - Backend data

```tsx
const commerce = await authService.getCommerce(wallet);
```

#### Current Contexts:

1. **PrivyProvider** - Authentication state (user, wallet)
2. **CommerceProvider** - Commerce data and registration flow

---

### 4. **Backend Integration Pattern**

#### Services Layer (`/services/`)

**config.ts** - Centralized configuration

```typescript
API_CONFIG.BASE_URL; // From NEXT_PUBLIC_API_BASE_URL
API_ENDPOINTS.COMMERCES.GET_BY_WALLET(wallet);
```

**api.ts** - HTTP Client

```typescript
apiClient.get(endpoint);
apiClient.post(endpoint, data);
// Automatic error handling, timeouts, JSON parsing
```

**[feature].service.ts** - Feature-specific API calls

```typescript
export const authService = {
  getCommerce(wallet): Promise<Commerce>
  registerCommerce(data): Promise<Commerce>
}
```

**index.ts** - Central exports

```typescript
export { authService } from "./auth.service";
export type { Commerce } from "./auth.service";
```

#### Usage in Components:

```tsx
import { authService, ApiError } from "@/services";

try {
  const commerce = await authService.getCommerce(wallet);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.message);
  }
}
```

---

### 5. **Component Patterns**

#### Client vs Server Components

**Server Component** (default)

- No `"use client"` directive
- Can fetch data directly
- Cannot use hooks or browser APIs
- Faster, smaller bundle

**Client Component**

- Has `"use client"` at top
- Can use React hooks
- Can use browser APIs
- Interactive elements

```tsx
// Server Component (default)
export function ServerComponent() {
  return <div>Static content</div>;
}

// Client Component
("use client");

import { useState } from "react";

export function ClientComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

#### Current Client Components:

- All pages (use `usePrivy()` hook)
- All feature components
- All UI components with interactivity

#### Authentication-Aware Components

Pattern used throughout the app:

```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";

export function MyPage() {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return <LoginPrompt />;
  }

  return <AuthenticatedContent />;
}
```

#### Commerce-Aware Components

For features that need commerce data:

```tsx
import { useCommerce } from "@/components/providers/commerce-provider";

export function MyComponent() {
  const { commerce, loading } = useCommerce();

  if (loading) return <Spinner />;
  if (!commerce) return null;

  return <div>{commerce.name}</div>;
}
```

---

### 6. **Styling Conventions**

#### Tailwind CSS Classes

**Standard pattern:**

```tsx
<div className="flex items-center gap-4 p-6 bg-card rounded-lg">
```

**Conditional classes:**

```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-variant"
)}>
```

#### Color System

Defined in `app/globals.css` via CSS variables:

**Primary colors:**

- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `bg-primary` - Brand color

**Text colors:**

- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `text-primary` - Brand text

**Semantic colors:**

- `text-green-600` - Positive/income
- `text-destructive` - Errors
- `border-border` - Borders

#### Dark Mode

- Automatically handled by theme-provider
- CSS variables update in `.dark` class
- No manual dark mode logic needed

---

### 7. **Type System**

#### Location: `/lib/types.ts`

**Core Business Types:**

```typescript
interface Payout {
  /* ... */
}
interface Transaction {
  /* ... */
}
interface PaymentLink {
  /* ... */
}
```

**Service Types:**

```typescript
// In /services/auth.service.ts
interface Commerce {
  /* ... */
}
interface CommerceData {
  /* ... */
}
```

#### Conventions:

- **Interfaces** for object shapes
- **Types** for unions: `type Status = "active" | "disabled"`
- **Export** all types used across files
- **Import types** with `type` keyword: `import type { Commerce } from "@/services"`

---

### 8. **Data Flow Architecture**

#### Current Flow (with Backend):

```
User Action
    ↓
React Component
    ↓
Service Call (authService.getCommerce)
    ↓
API Client (apiClient.get)
    ↓
Backend API
    ↓
Response
    ↓
Update Context/State
    ↓
Re-render Components
```

#### Example: Commerce Registration Flow

```
1. User logs in with Privy
   ↓
2. CommerceProvider checks if commerce exists
   ├─ GET /api/commerces/by-wallet/:wallet
   ├─ 200 → Commerce exists, store in context
   └─ 404 → Show registration modal
   ↓
3. User fills registration form
   ↓
4. POST /api/commerces with commerce data
   ↓
5. Commerce created, stored in context
   ↓
6. Modal closes, app becomes usable
```

---

### 9. **Page Structure Pattern**

Every page follows this structure:

```tsx
"use client";

// 1. Imports
import { usePrivy } from "@privy-io/react-auth";
import { Component } from "@/components/component";

// 2. Page Component
export default function MyPage() {
  // 3. Hooks
  const { authenticated } = usePrivy();
  const [state, setState] = useState();

  // 4. Auth Guard
  if (!authenticated) {
    return <LoginPrompt />;
  }

  // 5. Main Content
  return (
    <div className="space-y-6">
      <PageHeader />
      <PageContent />
    </div>
  );
}
```

---

### 10. **Component Creation Guidelines**

#### Before creating a component, ask:

1. **Is it UI-only?** → `/components/ui/` (use shadcn CLI)
2. **Is it a provider?** → `/components/providers/`
3. **Does it have 3+ related files?** → `/components/[feature]/`
4. **Is it page-specific?** → `/components/[component-name].tsx`

#### Template for new components:

```tsx
"use client"; // Only if needed

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  variant?: "default" | "secondary";
}

export function MyComponent({
  title,
  onAction,
  variant = "default",
}: MyComponentProps) {
  return (
    <div
      className={cn(
        "base-classes",
        variant === "secondary" && "secondary-classes"
      )}
    >
      <h3>{title}</h3>
      {onAction && <Button onClick={onAction}>Action</Button>}
    </div>
  );
}
```

---

### 11. **Adding New Backend Services**

#### Step-by-step process:

**1. Update `services/config.ts`**

```typescript
export const API_ENDPOINTS = {
  COMMERCES: {
    /* ... */
  },
  PAYOUTS: {
    CREATE: "/payouts",
    GET_ALL: "/payouts",
    GET_BY_ID: (id: string) => `/payouts/${id}`,
  },
};
```

**2. Create service file: `services/payout.service.ts`**

```typescript
import { apiClient } from "./api";
import { API_ENDPOINTS } from "./config";

export interface PayoutData {
  amount: number;
  currency: string;
  recipient: string;
}

export const payoutService = {
  async createPayout(data: PayoutData) {
    return apiClient.post(API_ENDPOINTS.PAYOUTS.CREATE, data);
  },

  async getAllPayouts() {
    return apiClient.get(API_ENDPOINTS.PAYOUTS.GET_ALL);
  },
};
```

**3. Export from `services/index.ts`**

```typescript
export { payoutService } from "./payout.service";
export type { PayoutData } from "./payout.service";
```

**4. Use in components**

```tsx
import { payoutService } from "@/services";

const payouts = await payoutService.getAllPayouts();
```

---

### 12. **Adding New Pages**

#### Process:

**1. Create route folder**

```bash
app/settings/page.tsx
```

**2. Create page component**

```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";

export default function SettingsPage() {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return <LoginPrompt />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      {/* Content */}
    </div>
  );
}
```

**3. Add to navigation (if needed)**

```tsx
// components/main-nav.tsx
const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/settings", label: "Settings", icon: Settings }, // Add here
  // ...
];
```

**4. Create page-specific components (if needed)**

```tsx
// components/settings-form.tsx
export function SettingsForm() {
  /* ... */
}
```

---

### 13. **Current Features Inventory**

#### ✅ Implemented Features:

**Authentication & Onboarding**

- Privy integration (email, wallet, social login)
- Embedded wallet creation
- Commerce registration flow (mandatory)
- Commerce verification on login

**Home Page**

- Quick Actions (Send, Deposit, New Payment Link, Show QR)
- Metrics cards (Balance, Total Received 30d, Total Payouts 30d)
- Recent Activity (last 10 transactions)

**Payouts Page**

- Statistics cards (Balance, Total Paid, Payout Count)
- Payout history table with filters
- Single payout creation
- Bulk CSV upload
- Payout details modal

**Activity Page**

- All transactions list
- Filter by type (Payment, Payout, Deposit)
- Filter by status
- Export to CSV
- Mercury-style formatting (To/From, +/- amounts)

**Receive Section**

- Landing page with 3 cards
- Payment Links: Create, manage, copy URL, disable
- Commerce Link: Permanent URL with QR code
- Developers: Coming soon page

**UI/UX**

- Navigation menu (Home, Receive, Payouts, Activity)
- Dark/light mode support
- Responsive design
- Toast notifications
- Loading states
- Error handling

---

### 14. **Tech Stack Reference**

#### Framework & Language

- **Next.js 15** - React framework (App Router)
- **React 19** - UI library
- **TypeScript** - Type safety

#### UI & Styling

- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Lucide React** - Icons
- **Geist Font** - Typography

#### Authentication & Backend

- **Privy** - Web3-native authentication
- **Custom Services Layer** - API integration

#### Utilities

- **date-fns** - Date manipulation
- **clsx + tailwind-merge** - Class utilities
- **react-hook-form** - Forms
- **zod** - Validation

---

### 15. **Important Rules & Best Practices**

#### ✅ DO:

- Use TypeScript for all new code
- Follow existing file structure
- Use existing UI components from `/components/ui/`
- Add auth guards to protected pages
- Handle loading and error states
- Use `cn()` for conditional classes
- Export types that cross file boundaries
- Document complex logic
- Test in both light and dark modes
- Ensure responsive design

#### ❌ DON'T:

- Edit `/components/ui/` components directly (use shadcn CLI)
- Mix business logic with UI components
- Hardcode API URLs (use environment variables)
- Forget to add `"use client"` when using hooks
- Skip TypeScript types
- Create duplicate utilities
- Ignore linter errors

---

### 16. **Environment Variables**

Required variables in `.env`:

```bash
# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id

# Backend API
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api
```

**Important:**

- All public env vars must start with `NEXT_PUBLIC_`
- Restart dev server after changing env vars
- Never commit `.env` to git

---

### 17. **Development Workflow**

#### Local Development:

```bash
# 1. Install dependencies
npm install

# 2. Configure .env
# Add NEXT_PUBLIC_PRIVY_APP_ID and NEXT_PUBLIC_API_BASE_URL

# 3. Start backend (port 3000)
# (in backend directory)

# 4. Start frontend (port 3001)
npm run dev

# 5. Open browser
http://localhost:3001
```

#### Port Configuration:

- **Backend**: `127.0.0.1:3000`
- **Frontend**: `localhost:3001`

#### Adding shadcn/ui components:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

---

### 18. **Code Quality Standards**

#### TypeScript

- Enable strict mode
- Define interfaces for all props
- Use type imports: `import type { ... }`
- No `any` types

#### Components

- One component per file
- Props interface above component
- Destructure props in function signature
- Use descriptive prop names

#### Styling

- Use Tailwind utilities first
- Only create custom CSS when necessary
- Follow color system (foreground, muted, primary)
- Use semantic spacing (gap-4, p-6, etc.)

---

### 19. **Future Expansion Areas**

#### Planned Features (add here):

- [ ] Account/Profile page (view/edit commerce data)
- [ ] Settings page
- [ ] Analytics dashboard
- [ ] Notifications system
- [ ] Multi-user support
- [ ] API keys management

#### When adding new features:

1. Update this documentation first
2. Create types in `/lib/types.ts`
3. Create service in `/services/` if backend integration needed
4. Create page in `/app/[feature]/`
5. Create components in `/components/`
6. Add to navigation if needed
7. Test authentication flow
8. Test loading/error states

---

### 20. **Common Patterns Reference**

#### Protected Page

```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ProtectedPage() {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return (
      <Card className="p-12 text-center">
        <Lock className="w-12 h-12 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Login Required</h3>
        <p className="text-sm text-muted-foreground">
          Please login to access this page
        </p>
      </Card>
    );
  }

  return <div>Protected content</div>;
}
```

#### Modal with Form

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function MyDialog({ open, onOpenChange }) {
  const [formData, setFormData] = useState({});

  const handleSubmit = async () => {
    // Validation
    // API call
    // Success handling
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>

        {/* Form fields */}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Table with Filters

```tsx
const [filter, setFilter] = useState("all");
const filtered = data.filter(
  (item) => filter === "all" || item.status === filter
);

return (
  <>
    <Select value={filter} onValueChange={setFilter}>
      {/* Options */}
    </Select>

    <Card>
      {filtered.map((item) => (
        <div key={item.id}>{/* Row */}</div>
      ))}
    </Card>
  </>
);
```

---

## 📚 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - High-level architecture overview
- [SERVICES.md](./SERVICES.md) - Services layer deep dive
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - Backend API reference
- [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - Environment setup
- [README.md](../README.md) - Quick start guide

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Maintainer**: Development Team

---

## ⚠️ Before Adding Features

1. ✅ Read this document
2. ✅ Check existing patterns
3. ✅ Follow conventions
4. ✅ Update documentation when adding new patterns
5. ✅ Ask if unsure about placement or structure

**This ensures code consistency and maintainability.**
