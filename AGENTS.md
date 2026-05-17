# simple-books — agent guide

Sole-proprietor bookkeeping on **Bun + TanStack Start + Drizzle (SQLite)**.

## Invariants

- Amounts: integer **cents** in DB; never `parseFloat` user money input.
- Quantities/rates: **micro-units** (×1e6) where fractional values matter.
- Every business event posts via `postJournalSync` in `src/server/posting.ts` (debits = credits).
- Server-only code: `*.server.ts` or dynamic `await import()` inside `createServerFn` handlers.
- Auth: `requireAuthMiddleware` on all business server functions.

## Skills (read before editing)

See [`.agents/skills/index.md`](.agents/skills/index.md):

- `tanstack-start-bun.md` — dev/build, import-protection
- `accounting-posting.md` — journal recipes
- `adding-a-server-fn.md` — RPC pattern
- `ui-components.md` — UI primitives
- `responsive-layout.md` — breakpoints & shell
- `settings-and-mileage-rates.md` — per-year IRS rates
- `document-storage.md` — attachments & S3
- `multi-user-auth.md` — OIDC-only after bootstrap

## Key paths

| Area | Path |
|------|------|
| Routes | `src/routes/` |
| Server fns | `src/server/*.functions.ts` |
| Schema | `src/db/schema.ts` |
| Layout | `src/components/layout/` |
| Design doc | `DESIGN.md` |
