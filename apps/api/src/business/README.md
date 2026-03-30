# Cron Services - Deramp Backend

## TokenPriceService

Service to update token prices from CoinGecko API and synchronize them with the database.

### Features

- ✅ Dynamic query of enabled tokens from database
- ✅ CoinGecko API integration
- ✅ Automatic price updates in database
- ✅ Robust error handling
- ✅ Detailed logging for debugging

### Basic Usage

```typescript
import { TokenPriceService } from "./tokenPrices";

const tokenService = new TokenPriceService();

// Update all token prices
await tokenService.updateAllTokenPrices();

// Get current prices from database
const currentPrices = await tokenService.getCurrentTokenPrices();

// Get price of a specific token
const usdcPrice = await tokenService.getTokenPrice("USDC");
```

### Testing

```typescript
// Run service tests
await tokenService.testService();
```

### Required Environment Variables

```env
COINGECKO_APIKEY=your_coingecko_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Service Flow

1. **Database Query**: Gets enabled tokens (`is_enabled = true`)
2. **API Call**: Queries prices from CoinGecko
3. **Database Update**: Updates `rate_to_usd`, `source`, and `updated_at`
4. **Logging**: Records each step of the process

### Updated Fields

- **`rate_to_usd`**: Current token price in USD
- **`source`**: Always "coingecko.com"
- **`updated_at`**: Timestamp of last update

### Error Handling

- CoinGecko rate limiting
- Authentication errors
- Database errors
- Detailed error logging
