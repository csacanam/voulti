#!/usr/bin/env node
/**
 * Voulti MCP server — accept crypto payments from any MCP client.
 *
 * Tools (all free, no API key — Voulti's integration API is no-auth):
 *   - create_invoice     → invoice + hosted checkout link
 *   - get_invoice        → payment status (Pending → Paid | Expired)
 *   - get_payment_link   → permanent pay-what-you-want link for a merchant
 *
 * Config (env):
 *   VOULTI_COMMERCE_ID   optional default commerce_id (from app.voulti.com → Receive Payments → Developers)
 *   VOULTI_API_BASE      default https://api.voulti.com
 *   VOULTI_CHECKOUT_BASE default https://voulti.com
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.VOULTI_API_BASE || "https://api.voulti.com";
const CHECKOUT_BASE = process.env.VOULTI_CHECKOUT_BASE || "https://voulti.com";
const DEFAULT_COMMERCE = process.env.VOULTI_COMMERCE_ID || null;

function text(t) {
  return { content: [{ type: "text", text: typeof t === "string" ? t : JSON.stringify(t, null, 2) }] };
}

function errorText(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function resolveCommerce(commerce_id) {
  const id = commerce_id || DEFAULT_COMMERCE;
  if (!id) {
    throw new Error(
      "No commerce_id. Pass it explicitly or set VOULTI_COMMERCE_ID. The merchant gets it at https://app.voulti.com → Receive Payments → Developers (self-service signup, ~1 minute).",
    );
  }
  return id;
}

const server = new McpServer({ name: "voulti", version: "0.1.0" });

server.tool(
  "create_invoice",
  "Create a payment invoice and get a hosted checkout link to send to the payer. You choose the pricing currency per invoice — a merchant is not tied to one. Ask the human which currency the price is in rather than guessing; the payer settles in stablecoins either way. Invoices expire in 1 hour by default; pass expires_at (ISO 8601) for slow payers. Use reference to tag the invoice with your own order id or client name.",
  {
    amount_fiat: z.number().positive().describe("Amount, expressed in `currency`"),
    currency: z
      .enum(["USD", "EUR", "COP", "ARS", "BRL", "MXN"])
      .describe("Currency the price is quoted in. Ask the human — do not assume."),
    commerce_id: z.string().optional().describe("Merchant id (defaults to VOULTI_COMMERCE_ID env)"),
    reference: z.string().max(200).optional().describe("Your own memo: order id, client name…"),
    expires_at: z.string().optional().describe("ISO 8601 expiration (default: 1 hour from now)"),
  },
  async ({ amount_fiat, currency, commerce_id, reference, expires_at }) => {
    let cid;
    try {
      cid = resolveCommerce(commerce_id);
    } catch (e) {
      return errorText(e.message);
    }
    const res = await fetch(`${API_BASE}/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commerce_id: cid,
        amount_fiat,
        currency,
        ...(reference !== undefined ? { reference } : {}),
        ...(expires_at !== undefined ? { expires_at } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return errorText(`HTTP ${res.status}: ${body.error || "invoice creation failed"}`);
    const inv = body.data || {};
    return text({
      ...inv,
      checkout_url: `${CHECKOUT_BASE}/checkout/${inv.id}`,
      next_step:
        "Send checkout_url to the payer. Then poll get_invoice until status is 'Paid' (or 'Expired' — create a new invoice to retry; never reuse expired links).",
    });
  },
);

server.tool(
  "get_invoice",
  "Check an invoice's payment status. status: Pending → Paid | Expired. On Paid it includes paid_tx_hash (on-chain proof), payment_method and paid_at. Poll every few seconds while the payer is at checkout. Verify Paid here before releasing goods — even if you also receive a webhook.",
  { invoice_id: z.string().describe("Invoice id (data.id from create_invoice)") },
  async ({ invoice_id }) => {
    const res = await fetch(`${API_BASE}/invoices/${encodeURIComponent(invoice_id)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return errorText(`HTTP ${res.status}: ${body.error || "invoice not found"}`);
    return text(body);
  },
);

server.tool(
  "get_payment_link",
  "Get the merchant's PERMANENT payment page link, where the payer types the amount themselves. Never expires. Good for tips, donations or 'pay what you owe' — for fixed amounts prefer create_invoice.",
  { commerce_id: z.string().optional().describe("Merchant id (defaults to VOULTI_COMMERCE_ID env)") },
  async ({ commerce_id }) => {
    let cid;
    try {
      cid = resolveCommerce(commerce_id);
    } catch (e) {
      return errorText(e.message);
    }
    return text({
      payment_link: `${CHECKOUT_BASE}/pay/${cid}`,
      note: "Permanent link — the payer chooses the amount. Payments appear in the merchant dashboard and fire the webhook, but are not tied to an invoice you can poll; for trackable charges use create_invoice.",
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
