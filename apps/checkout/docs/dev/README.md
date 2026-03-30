# Developer Documentation Hub

These guides are written for human engineers working on the `deramp` checkout frontend. They complement the AI-focused docs in `../ai/` by describing coding conventions, onboarding steps, and collaboration practices.

## Getting Started

- Install dependencies with `pnpm install` or `npm install` (project historically used pnpm; align with team preference).
- Run the app locally with `pnpm dev` / `npm run dev`. The checkout expects the backend running on `http://localhost:3000`.
- Environment variables: `VITE_BACKEND_URL` must be set in production-like builds. In dev, the proxy defaults to `localhost:3000`.

## Key References

- **Architecture Overview:** See `../ai/system-architecture.md` for the up-to-date map of modules. It applies to both AI and human contributors.
- **Payment Flow:** Start with `payment-flow.md` in this folder for the developer summary, then dive into `../ai/payment-flow.md` for automation guardrails.
- **Network Configuration:** Use `blockchain-config.md` here for day-to-day edits and `../ai/network-management.md` for automation-specific details.
- **Backlog:** `backlog.md` preserves the historical TODO list; treat it as a legacy backlog and refresh as needed.

## Frontend Conventions

- **Styling:** Tailwind utility classes. Prefer composing existing patterns instead of introducing custom CSS.
- **Translations:** All user-visible strings live in `src/locales/en.ts` and `src/locales/es.ts`. Add both translations before shipping.
- **Error UX:** Use the shared modal components (`ErrorModal`, `NetworkCongestionModal`, etc.) instead of `alert()` or ad-hoc toasts.
- **Network Data:** Always source chain/token metadata from `src/config/chains.ts`.

## Collaboration Notes

- Document significant changes in this folder. When automation updates the project, the AI-focused docs will change; mirror any developer-impacting nuances here.
- Keep docs ASCII to stay friendly with tooling.
- Coordinate with design before altering the visual theme; current deployments target a dark UI palette.
