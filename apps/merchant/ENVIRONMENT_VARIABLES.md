# Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```bash
# Privy Configuration
# Get this value from https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id-here

# Backend API
# URL of your backend API (include /api path)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

# Squid Router (Optional)
# Get this value from https://v2.app.squidrouter.com/
# Default: voulti-instant-payouts
NEXT_PUBLIC_SQUID_INTEGRATOR_ID=your-squid-integrator-id-here
```

## How to configure:

### Privy App ID

1. Go to [Privy Dashboard](https://dashboard.privy.io)
2. Create a new app or select your existing app
3. Copy your **App ID**
4. Paste it in your `.env` file

**Note**: The `NEXT_PUBLIC_PRIVY_CLIENT_ID` is optional and not required for this project

### Backend API URL

**Development**: `http://localhost:3000/api` (default)

**Production**: Update to your production backend URL, e.g. `https://api.yourdomain.com/api`

⚠️ **Important**: After changing environment variables, restart your Next.js development server
