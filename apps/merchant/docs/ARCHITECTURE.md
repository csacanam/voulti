# Frontend Architecture Guide

This document explains the structure and organization of the Voulti Instant Payouts frontend application.

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Home/Dashboard page
│   └── globals.css          # Global styles and theme variables
│
├── components/              # React Components
│   ├── ui/                 # Primitive UI components (shadcn/ui)
│   ├── providers/          # React Context providers
│   ├── create-payout/      # Multi-step payout creation flow
│   └── *.tsx               # Feature components
│
├── hooks/                   # Custom React hooks
│   ├── use-mobile.ts       # Responsive breakpoint detection
│   └── use-toast.ts        # Toast notification system
│
├── lib/                     # Utilities and core logic
│   ├── utils.ts            # Helper functions (cn, etc.)
│   ├── types.ts            # TypeScript type definitions
│   └── dummy-data.ts       # Mock data for development
│
├── public/                  # Static assets
│   └── *.{svg,png,jpg}     # Images and icons
│
└── Configuration Files
    ├── package.json         # Dependencies and scripts
    ├── tsconfig.json        # TypeScript configuration
    ├── next.config.mjs      # Next.js configuration
    ├── postcss.config.mjs   # PostCSS configuration
    ├── components.json      # shadcn/ui configuration
    └── .env                 # Environment variables
```

## 🏗️ Architecture Patterns

### 1. **App Router (Next.js 14+)**

- Uses the new Next.js App Router (not Pages Router)
- Server Components by default
- Client Components marked with `"use client"`

### 2. **Component Organization**

#### `/components/ui/` - Primitive Components

- Basic building blocks (Button, Card, Dialog, etc.)
- Generated and managed by shadcn/ui
- Should not contain business logic
- Reusable across the entire app

#### `/components/providers/` - Context Providers

- `privy-provider.tsx`: Authentication provider wrapper
- Wraps app at root level in `layout.tsx`

#### `/components/create-payout/` - Feature Modules

- Multi-step flow for creating payouts
- `single-payout-form.tsx`: Single payout form
- `upload-step.tsx`: Bulk CSV upload
- `validation-step.tsx`: Data validation
- `confirmation-step.tsx`: Final confirmation

#### `/components/*.tsx` - Feature Components

- `dashboard-header.tsx`: Top navigation with login/logout
- `stats-cards.tsx`: Balance and statistics display
- `payouts-list.tsx`: Payout history with filters
- `create-payout-dialog.tsx`: Dialog orchestrator for payout flow
- `payout-detail-dialog.tsx`: Individual payout details
- `theme-provider.tsx`: Dark/light mode support

### 3. **State Management**

- **Local State**: `useState` for component-specific state
- **Server State**: React hooks (no external library yet)
- **Authentication**: Privy SDK via `usePrivy()` hook

### 4. **Styling**

- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Theme tokens in `globals.css`
- **Dark Mode**: Automatic via theme-provider
- **cn() Helper**: For conditional class merging (from `lib/utils.ts`)

## 🔑 Key Technologies

### Core Framework

- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type safety

### UI & Styling

- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Lucide React**: Icon library
- **Geist Font**: Typography

### Authentication

- **Privy**: Web3-native auth (email, wallet, social)

### Utilities

- **date-fns**: Date manipulation
- **clsx + tailwind-merge**: Class name utilities
- **vaul**: Drawer component

## 🔐 Authentication Flow

### Setup

1. Environment variables configured in `.env`:

   ```bash
   NEXT_PUBLIC_PRIVY_APP_ID=your-app-id
   ```

2. Provider wraps app in `layout.tsx`:
   ```tsx
   <PrivyProviderWrapper>{children}</PrivyProviderWrapper>
   ```

### Usage

```tsx
import { usePrivy } from "@privy-io/react-auth";

const { ready, authenticated, login, logout, user } = usePrivy();
```

- `ready`: SDK is initialized
- `authenticated`: User is logged in
- `login()`: Opens login modal
- `logout()`: Logs out user
- `user`: User data (email, wallet, etc.)

## 📊 Data Flow

### Current (Development)

```
page.tsx (State) → Components (Props) → UI
     ↓
 dummy-data.ts
```

### Future (Production)

```
page.tsx → API Routes → Backend
              ↓
         Components
```

## 🎨 Theme System

### Color Tokens

Defined in `app/globals.css` using CSS variables:

- `--primary`: Main brand color
- `--secondary`: Secondary actions
- `--accent`: Highlights and success states
- `--muted`: Subtle backgrounds
- `--destructive`: Errors and warnings

### Dark Mode

Automatically managed by `theme-provider.tsx`. CSS variables update via `.dark` class.

## 📝 Type System

### Core Types (`lib/types.ts`)

```typescript
interface Payout {
  id: string;
  recipientName: string;
  amount: number;
  currency: string;
  amountUSD: number;
  date: string;
  status: "completed" | "pending" | "failed";
  transactionHash?: string;
}
```

## 🔧 Development Workflow

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm run start
```

### Code Quality

- TypeScript for type checking
- ESLint for code linting (configured in Next.js)

## 📦 Component Guidelines

### Creating New Components

1. **Decide Location**:

   - UI primitives → `/components/ui/`
   - Feature-specific → `/components/` or feature folder
   - Reusable across features → `/components/`

2. **Use TypeScript**:

   ```tsx
   interface ComponentProps {
     title: string;
     onClick?: () => void;
   }

   export function Component({ title, onClick }: ComponentProps) {
     // ...
   }
   ```

3. **Client vs Server**:

   - Add `"use client"` if component uses:
     - `useState`, `useEffect`, or other React hooks
     - Browser APIs
     - Event handlers

4. **Styling**:

   ```tsx
   // Use Tailwind classes
   <div className="flex items-center gap-4">

   // Use cn() for conditional classes
   <div className={cn("base-class", isActive && "active-class")}>
   ```

## 🚀 Adding New Features

### Example: Adding a Settings Page

1. **Create Route**:

   ```
   app/settings/page.tsx
   ```

2. **Create Components**:

   ```
   components/settings/
     ├── settings-form.tsx
     ├── profile-section.tsx
     └── preferences-section.tsx
   ```

3. **Add Types**:

   ```typescript
   // lib/types.ts
   interface Settings {
     theme: "light" | "dark";
     notifications: boolean;
   }
   ```

4. **Import in Page**:
   ```tsx
   import { SettingsForm } from "@/components/settings/settings-form";
   ```

## 🔍 Common Patterns

### Conditional Rendering Based on Auth

```tsx
const { authenticated } = usePrivy();

return <div>{authenticated ? <UserDashboard /> : <LoginPrompt />}</div>;
```

### Loading States

```tsx
const { ready } = usePrivy();

if (!ready) return <LoadingSpinner />;
```

### Toast Notifications

```tsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Success!",
  description: "Payout created successfully",
});
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Privy Documentation](https://docs.privy.io)
- [React Documentation](https://react.dev)

## 🐛 Troubleshooting

### "Module not found" errors

```bash
npm install
```

### Styling not applying

1. Check Tailwind classes are valid
2. Clear `.next` folder: `rm -rf .next`
3. Restart dev server

### Privy not initializing

1. Check `.env` has `NEXT_PUBLIC_PRIVY_APP_ID`
2. Restart dev server after adding env vars
3. Check browser console for errors

### TypeScript errors

```bash
npm run build  # Shows all type errors
```

## 🤝 Contributing

When working on this project:

1. Follow the existing file structure
2. Keep components small and focused
3. Add TypeScript types for props
4. Use existing UI components from `/components/ui/`
5. Test in both light and dark modes
6. Ensure responsive design (mobile, tablet, desktop)

---

**Last Updated**: October 2025
**Next.js Version**: 15.x
**React Version**: 19.x
