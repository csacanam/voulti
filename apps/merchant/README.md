# Voulti Instant Payouts - Frontend

Modern web application for managing instant payouts in PYUSD, settled in local stablecoins.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Privy App ID (get from [dashboard.privy.io](https://dashboard.privy.io))

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env` file in this directory:

   ```bash
   NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📦 Available Scripts

| Command         | Description                           |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start development server (hot reload) |
| `npm run build` | Build for production                  |
| `npm run start` | Start production server               |
| `npm run lint`  | Run ESLint                            |

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Authentication**: Privy
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Mono

## 📁 Project Structure

```
frontend/
├── app/              # Next.js App Router pages
│   ├── page.tsx     # Home (Quick Actions, Metrics, Activity)
│   ├── payouts/     # Payout management
│   ├── activity/    # Transaction history
│   └── receive/     # Payment links & commerce link
├── components/       # React components
│   ├── ui/          # Primitive UI components (shadcn/ui)
│   ├── providers/   # Context providers (Privy, Commerce)
│   └── ...          # Feature components
├── services/        # Backend API integration
├── hooks/           # Custom React hooks
├── lib/             # Utilities and types
└── docs/            # Documentation
```

**📖 Documentation:**

- [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) - Complete architecture & conventions
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - High-level overview
- [SERVICES.md](./docs/SERVICES.md) - Services layer guide
- [FRONTEND_INTEGRATION.md](./docs/FRONTEND_INTEGRATION.md) - Backend API reference

## 🔐 Authentication

This app uses [Privy](https://privy.io) for authentication, supporting:

- 📧 Email login
- 🔗 Wallet connection (Web3)
- 🔑 Social login (Google, etc.)

### Setup Privy

1. Create an account at [dashboard.privy.io](https://dashboard.privy.io)
2. Create a new app
3. Copy your App ID
4. Add it to `.env` as `NEXT_PUBLIC_PRIVY_APP_ID`
5. Restart the dev server

## 🎨 Features

### Current Features

- ✅ User authentication (Privy)
- ✅ Dashboard with balance and statistics
- ✅ Payout history with filtering
- ✅ Single payout creation
- ✅ Bulk payout upload (CSV)
- ✅ Dark/Light mode support
- ✅ Responsive design

### Upcoming Features

- 🔄 Real-time payout status updates
- 🔄 Blockchain integration
- 🔄 Multi-currency support
- 🔄 Advanced analytics

## 🧩 Key Components

### Layout Components

- **DashboardHeader**: Navigation with login/logout
- **StatsCards**: Balance and payout statistics

### Feature Components

- **PayoutsList**: Filterable payout history
- **CreatePayoutDialog**: Multi-step payout creation
- **PayoutDetailDialog**: Individual payout details

### Providers

- **PrivyProviderWrapper**: Authentication context
- **ThemeProvider**: Dark/light mode management

## 🎯 Development Guidelines

### Adding a New Component

```tsx
// components/my-component.tsx
"use client"; // Only if using hooks or browser APIs

import { Button } from "@/components/ui/button";

interface MyComponentProps {
  title: string;
}

export function MyComponent({ title }: MyComponentProps) {
  return (
    <div className="flex items-center gap-4">
      <h2>{title}</h2>
      <Button>Click me</Button>
    </div>
  );
}
```

### Using Authentication

```tsx
"use client";

import { usePrivy } from "@privy-io/react-auth";

export function MyPage() {
  const { authenticated, login, user } = usePrivy();

  if (!authenticated) {
    return <button onClick={login}>Login</button>;
  }

  return <div>Welcome {user.email?.address}!</div>;
}
```

### Styling with Tailwind

```tsx
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-card rounded-lg">

// Conditional classes with cn()
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "opacity-50"
)}>
```

## 🐛 Troubleshooting

### Port already in use

```bash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

### Privy not loading

1. Check `.env` file exists and has `NEXT_PUBLIC_PRIVY_APP_ID`
2. Restart dev server
3. Clear browser cache
4. Check browser console for errors

### Styling issues

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript errors

```bash
# Check all type errors
npm run build
```

## 📚 Learn More

- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)
- **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)
- **Privy**: [docs.privy.io](https://docs.privy.io)
- **Architecture**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 🤝 Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Keep components small and focused
4. Test in both light and dark modes
5. Ensure responsive design
6. Document complex logic

## 📝 Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for details.

## 📄 License

Part of the Voulti Instant Payouts project.

---

**Need help?** Check [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed documentation.
