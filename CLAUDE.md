# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory rules (from `replit.md` + user preferences)

전역 작업 원칙(기획자 역할, 7원칙, `PLAN.md` 참조 등)은 `~/.claude/CLAUDE.md`에 있으며 그 위에 아래 프로젝트 전용 규칙이 더해집니다. `PLAN.md`는 이 저장소 루트에 존재합니다.

1. **Do NOT modify `shared/schema.ts`** without explicit instruction. After any approved schema change, run `npm run db:push`.
2. **All user-facing text is Korean; code, comments, and commit messages are English.**
3. **Deliver complete file contents** when the user is copy-pasting — never partial snippets or "add this line" instructions.
4. **Never store brand prompts or core business logic in external services** (Make.com, Zapier, etc.). All orchestration lives in the Express server; external APIs (FAL.AI, Anthropic, OpenAI, Meta, Resend, Stripe) are called directly from server code.

## Commands

```bash
npm run dev       # tsx server/index.ts — Express + Vite middleware on http://127.0.0.1:3000
npm run build     # script/build.ts — vite build (client → dist/public) + esbuild (server → dist/index.cjs)
npm start         # node dist/index.cjs (production; binds 0.0.0.0:$PORT)
npm run check     # tsc --noEmit (typecheck only; no test runner in this project)
npm run db:push   # drizzle-kit push — sync shared/schema.ts to Postgres (Supabase)
```

Node engine: `>=20 <23`. There is no test suite — `check` is the only static verification gate.

## Architecture

**Monorepo layout.** Single `package.json` with three roots sharing types via path aliases (`@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets/*` → `attached_assets/*`):

- `client/` — React 18 + Vite SPA. Root is `client/`, output `dist/public/`. Routing via `wouter`. Server state via `@tanstack/react-query`. Context for cart/pet/auth. Styling via Tailwind + shadcn/ui.
- `server/` — Express 5 REST + Socket.io. Single entry `server/index.ts` wires middleware, webhooks, routes, and static serving.
- `shared/` — Drizzle Postgres schema + Zod validators, imported by both client and server.

**Server boot order matters** (`server/index.ts`):
1. `setupChat(httpServer)` — Socket.io listeners attached before HTTP routes.
2. **Stripe webhook `/api/stripe/webhook` is mounted with `express.raw()` BEFORE the global `express.json()`** — signature verification requires the raw body. Do not reorder.
3. Resend inbound webhook is mounted before JSON parser too but uses `express.json()` locally.
4. Global middleware, then `registerAdminRoutes` → `registerWooCommerceRoutes` → `registerRoutes`.
5. Production: `serveStatic(app)` serves `dist/public`. Dev: `setupVite()` attaches Vite middleware.
6. Startup cleanups (`deleteProductsWithoutSourcing`, `deduplicateBySupplierProductId`), Supabase bucket init, `cleanupOldContent` (24h interval), content `startScheduler()` cron.

**Build is custom, not tsc/tsup** (`script/build.ts`): vite builds the client, then esbuild bundles the server into a single minified CJS file. An **allowlist** in `script/build.ts` enumerates which deps get inlined; everything else stays external and is resolved from `node_modules` at runtime. **If you add a server dependency that should be bundled (for cold-start perf), add its name to the allowlist.**

**Drizzle schema** (`shared/schema.ts`) is the single source of truth for the Postgres tables (users, categories, products, cart_items, orders, profiles, messages, …). Schema edits require `npm run db:push`. Generated SQL lives under `migrations/`.

**Frontend routing** is declared in `client/src/App.tsx`. Admin routes (`/admin/*`) are password-gated via `ADMIN_PASSWORD` — `AdminLogin` guards the rest. Storefront-only extras (`ChatWidget`, `NewsletterPopup`) are suppressed on `/admin`, `/checkout`, `/login`.

**Customer auth** is Supabase (Magic Link + Google OAuth). Client initializes from `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Server validates JWTs with `SUPABASE_SERVICE_ROLE_KEY`. `AuthProvider` calls `POST /api/auth/sync-profile` on auth state change.

**Admin CRM** (`/admin/crm`) is a Socket.io-backed messenger UI unifying email (Resend), live chat, WhatsApp, and SMS into one timeline per profile. Channel is inferred via `inferChannel()`. Product recommendations route through `/api/admin/ai/recommend-products` and embed as `PCARD` metadata in message bodies, which bubble renderers parse back into styled cards. See `replit.md` for the full feature inventory — it documents behavior that isn't obvious from code alone.

**Content generation services** (`server/services/`): `cardNewsService`, `motionReelsService`, `musicMixService`, `contentRenderer`, `templateRenderer` — these render HTML templates from `server/templates/` using Puppeteer (Chromium) and, for reels, ffmpeg. Both binaries are provided by Nix on Railway (`nixpacks.toml`); locally you need them on PATH. `PUPPETEER_SKIP_DOWNLOAD=true` is set, so Puppeteer uses the system Chromium via `PUPPETEER_EXECUTABLE_PATH`.

## Deployment (Railway + Supabase)

Migrated off Replit to Railway + Supabase (see `RAILWAY_DEPLOY.md`). Railway uses `nixpacks.toml` (node 20, ffmpeg, chromium + GTK/X11 deps) and `railway.json` (`npm run build` → `npm start`). Port is injected via `PORT`; host is `0.0.0.0` in production.

**Replit debt still in the tree** (see `memory/project_replit_debt.md` if present): `stripe-replit-sync` expects a Replit token and won't work on Railway — Stripe keys are read directly from env (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). WooCommerce routes (`woocommerceRoutes.ts`) exist as a fallback. `server/replit_integrations/` and `client/replit_integrations/` wrap OpenAI calls via `AI_INTEGRATIONS_OPENAI_API_KEY` (distinct from `OPENAI_API_KEY`). Do not assume Replit env (`REPL_ID`, `REPLIT_*`) is present.

**Uploads** have moved to Supabase Storage. `client/public/uploads/` still exists for legacy/local fallback but is not the source of truth.

## Environment

Copy `.env.example` → `.env` for local dev. Required keys: `DATABASE_URL`, `SUPABASE_*` (3 server + 2 `VITE_*` client), `ADMIN_PASSWORD`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_API_KEY`. Optional: `RESEND_API_KEY`, `STRIPE_*`, `WC_*`. Dates render in `Australia/Sydney` timezone; Vite injects `__BUILD_VERSION__` / `__BUILD_DATE__` at build time using that TZ.
