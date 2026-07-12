# voulti-mcp

MCP server for [Voulti](https://voulti.com) — accept crypto payments from any AI agent. Create an invoice with one call, share the hosted checkout link, and confirm payment. USDC, USDT and stablecoins on 5 networks (Celo, Base, Arbitrum, Polygon, BSC), instant self-custody settlement, 1% fee. **No API key — all tools are free to call.**

## Install

**Claude Code:**

```bash
claude mcp add voulti -- npx -y voulti-mcp
```

**Cursor / any MCP client** (`.mcp.json` / `mcp.json`):

```json
{
  "mcpServers": {
    "voulti": {
      "command": "npx",
      "args": ["-y", "voulti-mcp"],
      "env": {
        "VOULTI_COMMERCE_ID": "your-commerce-id"
      }
    }
  }
}
```

## Configuration

| Env var | Required | Description |
|---|---|---|
| `VOULTI_COMMERCE_ID` | no | Default merchant id, so the agent doesn't pass it on every call. Get it at [app.voulti.com](https://app.voulti.com) → Receive Payments → Developers (self-service signup, ~1 minute). |
| `VOULTI_API_BASE` | no | Default `https://api.voulti.com`. |

No secrets, no wallet, no API key: Voulti's integration API is public, and settlement goes straight to the merchant's own wallet.

## Tools

| Tool | What it does |
|---|---|
| `create_invoice` | Invoice for a fixed amount (in the merchant's base currency) → hosted checkout link. Supports `reference` (your order id / client name) and custom `expires_at` (default 1 hour) |
| `get_invoice` | Payment status: `Pending` → `Paid` \| `Expired`, with `paid_tx_hash` on-chain proof |
| `get_payment_link` | The merchant's permanent pay-what-you-want page (never expires) |

## Typical flow

1. Human: "charge my client Andrés $150".
2. `create_invoice` `{ amount_fiat: 150, reference: "andres-logo" }` → send `checkout_url` to Andrés.
3. Andrés pays with any wallet, in the stablecoin/network he prefers.
4. `get_invoice` until `status: "Paid"` → funds are already in the merchant's wallet (minus 1%).

Full guide: [voulti.com/skill.md](https://voulti.com/skill.md) · LLM index: [voulti.com/llms.txt](https://voulti.com/llms.txt)
