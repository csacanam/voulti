# TODO List - Deramp Backend

## 🔒 Security & Authentication

### High Priority

- [ ] **Implement API Authentication**

  - Add JWT token-based authentication for sensitive endpoints
  - Protect invoice update endpoints (`PUT /api/invoices/:id/status`, `PUT /api/invoices/:id/payment-data`)
  - Add API key authentication for commerce-specific operations
  - Implement rate limiting to prevent abuse

- [ ] **Add Request Validation**
  - Validate all incoming request data with proper schemas
  - Add input sanitization to prevent injection attacks
  - Implement CORS configuration for production
  - Add request logging for security auditing

### Medium Priority

- [ ] **Commerce Authentication**
  - Add commerce-specific API keys
  - Implement webhook signature verification
  - Add IP whitelisting for admin operations

## ⏰ Invoice Expiration System

### High Priority

- [ ] **Backend Expiration Logic**

  - Create a cron job to check expired invoices every hour
  - Update invoice status from `Pending` to `Expired` automatically
  - Add `expired_at` timestamp when invoice expires
  - Send notifications to commerce when invoices expire

- [ ] **Blockchain Expiration Handling**
  - Implement automatic cancellation of expired invoices on blockchain
  - Add gas estimation for cancellation transactions
  - Handle failed cancellation attempts gracefully
  - Log all expiration-related blockchain operations

### Medium Priority

- [ ] **Expiration Notifications**
  - Send email/SMS notifications before invoice expires (e.g., 1 hour before)
  - Add webhook notifications for expiration events
  - Create dashboard alerts for expired invoices

## 💰 Token Price Updates

### High Priority

- [ ] **CoinGecko Integration**

  - Create service to fetch token prices from CoinGecko API
  - Implement daily cron job to update `tokens.rate_to_usd`
  - Add fallback mechanism if CoinGecko is unavailable
  - Store historical price data for analytics

- [ ] **Price Update Service**
  ```typescript
  // Example implementation
  interface TokenPriceService {
    updateTokenPrices(): Promise<void>;
    getTokenPrice(symbol: string): Promise<number>;
    getPriceHistory(symbol: string, days: number): Promise<PricePoint[]>;
  }
  ```

### Medium Priority

- [ ] **Price Monitoring**
  - Add alerts for significant price changes
  - Implement price validation to detect anomalies
  - Add multiple price sources for redundancy

## 💱 Fiat Exchange Rate Updates

### High Priority

- [ ] **OpenExchangeRates Integration**

  - Create service to fetch fiat rates from OpenExchangeRates API
  - Implement daily cron job to update `fiat_exchange_rates.usd_to_currency_rate`
  - Add support for multiple fiat currencies (COP, EUR, USD, etc.)
  - Handle API rate limits and quotas

- [ ] **Exchange Rate Service**
  ```typescript
  // Example implementation
  interface ExchangeRateService {
    updateFiatRates(): Promise<void>;
    getExchangeRate(from: string, to: string): Promise<number>;
    convertAmount(amount: number, from: string, to: string): Promise<number>;
  }
  ```

### Medium Priority

- [ ] **Rate Monitoring**
  - Add alerts for significant exchange rate changes
  - Implement rate validation and anomaly detection
  - Add historical rate tracking for analytics

## 📢 Commerce Notifications

### High Priority

- [ ] **Payment Notification System**

  - Send immediate notifications when payment is received
  - Support multiple notification channels (email, SMS, webhook)
  - Add notification preferences per commerce
  - Implement retry logic for failed notifications

- [ ] **Webhook System**
  ```typescript
  // Example webhook payload
  interface PaymentWebhook {
    event: "payment.received" | "invoice.expired" | "invoice.cancelled";
    invoice_id: string;
    commerce_id: string;
    amount: number;
    currency: string;
    paid_token?: string;
    paid_tx_hash?: string;
    timestamp: string;
  }
  ```

### Medium Priority

- [ ] **Notification Templates**
  - Create customizable email templates
  - Add multi-language support (Spanish/English)
  - Implement notification scheduling
  - Add notification history and delivery status

## 🚀 Infrastructure & Performance

### High Priority

- [ ] **Environment Management System**

  - Implement production/test mode configuration
  - Add environment-specific network selection (Alfajores for test, Mainnet for production)
  - Create environment validation on startup
  - Add environment-specific contract addresses and configurations

- [ ] **Celo Mainnet Integration**

  - Add Celo mainnet network configuration
  - Update contract addresses for mainnet deployment
  - Implement mainnet-specific token addresses
  - Add mainnet testing and validation procedures

- [ ] **Database-Driven Configuration**

  - Replace hardcoded token configurations with database queries
  - Use `tokens_addresses` table for all token contract addresses
  - Use `networks` table for all network configurations
  - Eliminate local config files to improve maintainability
  - Create database migration scripts for new networks/tokens

- [ ] **Cron Job System**

  - Set up cron jobs for daily price updates
  - Implement invoice expiration checks
  - Add health checks and monitoring
  - Create job queue for background tasks

- [ ] **Error Handling & Logging**
  - Implement comprehensive error logging
  - Add request/response logging for debugging
  - Create error alerting system
  - Add performance monitoring

### Medium Priority

- [ ] **Caching System**
  - Cache token prices and exchange rates
  - Implement Redis for session management
  - Add response caching for static data
  - Optimize database queries

## 📊 Analytics & Monitoring

### Medium Priority

- [ ] **Business Analytics**

  - Track payment success rates
  - Monitor commerce performance
  - Add revenue analytics
  - Create admin dashboard

- [ ] **System Monitoring**
  - Add health check endpoints
  - Implement uptime monitoring
  - Create performance dashboards
  - Add alerting for system issues

## 🔧 Development & Testing

### Medium Priority

- [ ] **Testing Suite**

  - Add unit tests for all services
  - Implement integration tests
  - Add end-to-end testing
  - Create test data and fixtures

- [ ] **Development Tools**
  - Add API documentation (Swagger/OpenAPI)
  - Create development environment setup
  - Add debugging tools and logging
  - Implement code quality checks

## 📋 Implementation Priority

### Phase 1 (Critical - Week 1-2)

1. Environment Management System
2. Database-Driven Configuration
3. Celo Mainnet Integration
4. API Authentication & Security

### Phase 2 (Important - Week 3-4)

1. Invoice Expiration System
2. Basic Token Price Updates
3. Fiat Exchange Rate Updates
4. Cron Job Infrastructure

### Phase 3 (Enhancement - Week 5-6)

1. Payment Notifications
2. Advanced Notifications
3. Analytics & Monitoring
4. Testing Suite

## 🛠️ Technical Considerations

### Security

- Use environment variables for all sensitive data
- Implement proper input validation
- Add request rate limiting
- Use HTTPS in production
- Regular security audits
- Implement API key rotation for production

### Performance

- Implement caching strategies
- Optimize database queries
- Use connection pooling
- Monitor memory usage
- Add performance metrics
- Implement database connection pooling

### Reliability

- Add retry mechanisms for external APIs
- Implement circuit breakers
- Add health checks
- Create backup strategies
- Monitor system resources
- Implement graceful degradation for external services

### Maintainability

- Use database as single source of truth for configurations
- Implement automated testing for all critical paths
- Add comprehensive logging for debugging
- Create clear separation between test and production environments
- Document all environment-specific configurations

---

**Last Updated**: July 2025  
**Priority**: High  
**Status**: Planning Phase
