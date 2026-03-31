# Voulti Smart Contracts

Modular proxy-based payment processing system. Deployed on Celo, Arbitrum, Polygon, Base, and BSC.

## Contracts

| Contract | Purpose |
|----------|---------|
| DerampProxy | Entry point, routes calls to modules |
| DerampStorage | Centralized data (balances, invoices, roles) |
| AccessManager | Role-based access, token/commerce whitelisting |
| InvoiceManager | Invoice creation, status, queries |
| PaymentProcessor | Payment execution, fee calculation |
| TreasuryManager | Service fee collection and withdrawal |
| WithdrawalManager | Commerce fund withdrawals |

## Payment Flow

1. Commerce is whitelisted via AccessManager
2. Invoice created via InvoiceManager with payment options (token + amount)
3. Customer pays via `payInvoice(invoiceId, token, amount)`
4. Service fee (1% default) deducted, rest credited to commerce balance
5. Commerce withdraws via `withdrawTo(token, amount, address)`

## Production Addresses

See [deployed-addresses/PRODUCTION.md](deployed-addresses/PRODUCTION.md)

| Network | Proxy |
|---------|-------|
| Celo | `0xcdbBc0DB75bCE387Bdc9Ea2248c5f92b1f8D88C1` |
| Arbitrum | `0xf8553C9Df40057b2920A245637B8C0581EC75767` |
| Polygon | `0xc7F4313179532680Fc731DAD955221e901A582D9` |
| Base | `0x7D8a7f89c3A9A058A0F8f1a882188B1D42ba9B95` |
| BSC | `0xDf90971E8A1370dFE4BD5A9321e8bB90b4d1a08F` |

Operator: `0x21581Cb82D9a66126fBe7639f4AF55DdfEA48E26`

## Deploy

```bash
cp env.example .env
# Edit PRIVATE_KEY, ADMIN_WALLET, BACKEND_WALLET

npx hardhat run scripts/deploy.ts --network celo
# If partially fails: npx hardhat run scripts/setup-deployed.ts --network celo
```

## Tests

```bash
npx hardhat test
```
