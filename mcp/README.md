# voulti-mcp

MCP server for [Voulti](https://voulti.com) — accept crypto payments from any AI agent. Create an invoice with one call, share the hosted checkout link, and confirm payment. USDC, USDT and stablecoins on 5 networks (Celo, Base, Arbitrum, Polygon, BSC), 1% fee, settled on-chain to a balance the merchant withdraws from their dashboard. **No API key — all tools are free to call.**

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

No secrets, no wallet, no API key: Voulti's integration API is public.

## Tools

| Tool | What it does |
|---|---|
| `create_invoice` | Invoice for a fixed amount, in the currency you choose per invoice, → hosted checkout link. Supports `reference` (your order id / client name) and custom `expires_at` (default 1 hour) |
| `get_invoice` | Payment status: `Pending` → `Paid` \| `Expired`, with `paid_tx_hash` on-chain proof |
| `get_payment_link` | The merchant's permanent pay-what-you-want page (never expires) |

## Typical flow

1. Human: "charge my client Andrés $150".
2. `create_invoice` `{ amount_fiat: 150, reference: "andres-logo" }` → send `checkout_url` to Andrés.
3. Andrés pays with any wallet, in the stablecoin/network he prefers.
4. `get_invoice` until `status: "Paid"` → the merchant's Voulti balance is credited (minus 1%). It is **not** in their wallet until they withdraw from the dashboard; see "Where the money actually is" in the full guide.

Full guide: [voulti.com/skill.md](https://voulti.com/skill.md) · LLM index: [voulti.com/llms.txt](https://voulti.com/llms.txt)
