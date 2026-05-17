# simple-books — agent guide

Sole-proprietor bookkeeping on **Bun + TanStack Start + Drizzle (SQLite)**.

## Invariants

- Amounts: integer **cents** in DB; never `parseFloat` user money input.
- Quantities/rates: **micro-units** (×1e6) where fractional values matter.
- Every business event posts via `postJournalSync` in `src/server/posting.ts` (debits = credits).
- Server-only code: `*.server.ts` or dynamic `await import()` inside `createServerFn` handlers.
- Auth: `requireAuthMiddleware` on all business server functions.

## Skills (read before editing)

Agent Skills in [`.agents/skills/`](.agents/skills/) (`skill-name/SKILL.md`):

- `tanstack-start-bun` — dev/build, import-protection
- `accounting-posting` — journal recipes
- `adding-a-server-fn` — RPC pattern
- `ui-components` — UI primitives
- `responsive-layout` — breakpoints & shell
- `settings-and-mileage-rates` — per-year IRS rates
- `document-storage` — attachments & S3
- `multi-user-auth` — OIDC-only after bootstrap
- `deployment` — Docker, Helm, release-please
- `playing-with-playwright` — smoke test runbook
- `adversarial-security-review` — hostile/LLM-aware security review before merge

## Key paths

| Area | Path |
|------|------|
| Routes | `src/routes/` |
| Server fns | `src/server/*.functions.ts` |
| Schema | `src/db/schema.ts` |
| Layout | `src/components/layout/` |
| Design doc | `DESIGN.md` |
