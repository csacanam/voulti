# AI Operator Documentation Hub

These notes are written for autonomous or semi-autonomous AI agents who need to modify the `deramp` checkout frontend. The goal is to highlight the most relevant constructs, the guardrails agreed with the product team, and the places where precision is critical.

## Quick Start
- **Read `system-architecture.md` first** for a mental model of the runtime stack and directory layout.
- Use `payment-flow.md` when touching anything that authorizes or executes payments.
- Consult `network-management.md` before editing chain IDs, token lists, or wallet switching logic.
- For UX changes, see `../dev/` docs to align with human-facing style rules and developer workflows.

## Contents
- `system-architecture.md` — Map of core modules, data flow, and design principles.
- `payment-flow.md` — Detailed breakdown of the payment CTA lifecycle and backend contracts.
- `network-management.md` — How chains, tokens, and wallet switching are configured and enforced.

### Expectations
- **Do not reintroduce `alert()` calls.** Custom modal components exist for every error class.
- **Respect centralized config.** Chain and token data must come from `src/config/chains.ts`.
- **Keep docs current.** Whenever you ship new AI-driven modifications, add or update the relevant file here.

