# Simple-Books — Design Document

> Google-style design doc covering goals, non-goals, architecture, data model,
> security posture, and visual design system. Source of truth for design
> consistency across iterations. Keep this terse and current.

---

## 1. Background

Sole proprietors who sell services (consultants, trainers, coaches, trades) are
underserved by existing bookkeeping software, which is either:

1. **Too heavy**: QuickBooks-style apps demand chart-of-accounts literacy,
   inventory, payroll, vendor bills — features the audience never touches.
2. **Too light**: Spreadsheets and "invoice generators" don't produce a real
   set of books or a balance sheet, leaving the owner unprepared at tax time.

We're building the smallest possible product that produces a *real* set of
double-entry books while staying friendly enough for non-accountants.

## 2. Goals

- The owner can record everything that happens in a typical service-business
  week in under 60 seconds per record.
- Every transaction posts to a proper double-entry journal — the balance sheet
  always balances; cash flow is reconstructable to the penny.
- Secure by default: short-lived sessions, OIDC for "real" auth, never trust
  client input.
- Beautiful, calm, opinionated UI that earns trust on first load.

## 3. Non-Goals (MVP)

- No customer portals, email notifications, payment processing, or PDF export
  in MVP (invoice *records* only).
- No multi-org or role-based access (single shared books per install).
- No charts/graphs. Tables and totals tell the story for MVP.
- No payroll, sales tax engine, multi-currency, foreign exchange, inventory,
  bank-feed integrations.
- No native mobile apps (responsive web is mobile-primary).

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React 19 + TanStack Router + Tailwind v4)         │
│   - File-based routes in src/routes                         │
│   - Protected layout group (_app)                           │
│   - Auth client (better-auth/react)                         │
└─────────────────────────────────────────────────────────────┘
                        │  RPC over HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Nitro v3 server (Bun preset, runs `Bun.serve`)             │
│   - TanStack Start RPC endpoints (createServerFn)           │
│   - /api/auth/* — Better Auth handler                       │
│   - Server-only modules (`*.server.ts`) hold DB + secrets   │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Persistence                                                │
│   - SQLite (bun:sqlite, WAL mode) via Drizzle ORM           │
│   - Single file: ./data/simple-books.db                     │
│   - Auth tables managed by Better Auth (Drizzle adapter)    │
│   - Business tables described in §5                         │
└─────────────────────────────────────────────────────────────┘
```

Runtime: **Bun 1.3+**. Build: `bun --bun vite build` → `.output/server/`
served by `bun run start`. Dev: `bun --bun vite dev` (HMR via Vite).

## 5. Data Model (Business Tables)

All amounts stored as integer **cents** (`INTEGER`) to avoid float drift.

### `chart_accounts`
Seeded on first boot with the canonical accounts:

| code | name | type | normal |
| ---- | ---- | ---- | ------ |
| 1000 | Cash | asset | debit |
| 1100 | Accounts Receivable | asset | debit |
| 3000 | Owner's Equity | equity | credit |
| 3010 | Owner's Contribution | equity | credit |
| 3020 | Owner's Draw | equity | debit |
| 4000 | Services Revenue | revenue | credit |
| 6100 | Vehicle / Mileage Expense | expense | debit |

### `customers`
`id`, `name`, `email?`, `notes?`, `created_at`.

### `service_products`
`id`, `name`, `description?`, `unit` (e.g. "hour", "session", "project"),
`rate_cents`, `active`, `created_at`.

### `invoices`
`id`, `number` (monotonic per year, e.g. `2026-0001`), `customer_id`,
`issued_on` (date), `due_on` (date), `status` (`open` | `paid` | `void`),
`memo?`, `subtotal_cents`, `created_at`, `auto_created` (bool — true if
generated from a payment with no matching invoice).

### `invoice_lines`
`id`, `invoice_id`, `service_product_id?`, `description`, `quantity_micro`
(qty × 1e6 to support partial hours), `unit_price_cents`, `amount_cents`.

### `cash_receipts`
`id`, `received_on`, `customer_id`, `invoice_id`, `amount_cents`, `method`
(`cash` | `check` | `card` | `transfer` | `other`), `memo?`, `created_at`.

### `mileage_entries`
`id`, `trip_date`, `miles_micro` (miles × 1e6), `rate_micro_per_mile` (IRS
rate in micro-dollars per mile; default seeded from settings), `purpose`,
`amount_cents` (computed at write time = round(miles × rate)), `created_at`.

### `journal_entries` / `journal_lines`
Generic double-entry ledger. Every business event (invoice issued, receipt
recorded, mileage logged) writes one `journal_entries` row plus ≥2
`journal_lines`. The sum of debits equals the sum of credits — enforced in
code, asserted in every posting helper.

### `mileage_rates`
Per calendar-year IRS standard business rate. `rate_micro_per_mile` stores
cents-per-mile × 10_000 (supports half-cent rates, e.g. 72.5¢ → 725000).
Each `mileage_entries` row snapshots the rate used at entry time.

### `attachments`
Supporting documents (images, PDFs) linked to invoices, cash receipts, or
mileage entries. Stored locally under `./data/uploads/` or in S3-compatible
object storage when `S3_ENDPOINT` is configured.

### `settings`
Key-value table. Notable keys: `fiscal_year_start_month` (default 1).

## 6. Posting Rules

| Event | Debit | Credit |
| ----- | ----- | ------ |
| Invoice issued | 1100 A/R | 4000 Services Revenue |
| Cash receipt against invoice | 1000 Cash | 1100 A/R |
| Cash receipt with no invoice | (auto-create invoice first, then post above) | |
| Mileage entry | 6100 Vehicle Expense | 3010 Owner's Contribution |
| Invoice void | reverse the original entry | |

Implemented by a small `posting.server.ts` engine that takes a typed event and
returns lines, then atomically writes journal + business rows in one Drizzle
transaction.

## 7. Reports

### Balance Sheet (as of `date`)
- **Assets**: Cash, A/R, total.
- **Liabilities**: (none in MVP, shown as `$0.00`).
- **Equity**: Owner's Contribution, Owner's Draw, Retained Earnings (= net
  income to date = Revenue − Expenses), total.
- Asserts Assets == Liabilities + Equity.

### Cash Flow (period `from..to`)
- **Operating inflows**: list of cash receipts in period, summed.
- **Operating outflows**: list of cash-paid expenses in period (MVP: none —
  mileage is a non-cash equity contribution, so it does not appear here).
- **Net change in cash** for the period; opening + closing cash balances.

Both reports render as semantic HTML tables (printable). No charts in MVP.

## 8. Security Posture

- **Auth**: Better Auth with email+password (dev/bootstrap) and a generic OIDC
  provider (production). Passwords ≥12 chars, scrypt by default.
- **Sessions**: HTTP-only, `SameSite=Lax`, `Secure` in prod, signed with
  `BETTER_AUTH_SECRET`.
- **CSRF**: Better Auth's signed-cookie + origin check.
- **Rate limiting**: Better Auth's defaults; `/sign-in/email` tightened to
  3 attempts / 10s.
- **Multi-user**: one bootstrap owner (email sign-up if OIDC is off, SSO if OIDC is on);
  no further email sign-up; additional users via OIDC when configured.
  All users share one set of books (no row-level permissions).
- **Authorization**: every business `createServerFn` attaches the
  `requireAuthMiddleware` (defined in `src/lib/auth.functions.ts`), which
  injects the session into `context` and throws 401 when missing. The DB
  client and Better Auth instance are marked `server-only` (via the
  `'@tanstack/react-start/server-only'` import), so they cannot leak into
  the client bundle.
- **Input validation**: Zod schemas at every server-function boundary.
- **Money**: integer cents everywhere; never `parseFloat`.
- **Attachments**: images/PDFs on invoices, receipts, mileage; local dir or
  S3-compatible storage. When S3 is used, configure bucket retention for IRS
  audit periods (callout on Settings).
- **Audit**: `created_at` on every row; journal entries are append-only (no
  edits, only reversals).
- **Headers**: Nitro sets `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, plus a baseline CSP in production.

## 9. Visual Design System

### Mood

Calm, considered, paper-like. The aesthetic of a beautifully-laid-out
accountant's ledger, not a SaaS dashboard. Generous whitespace, restrained
color, confident typography.

### Type

- **UI sans**: `"Inter", system-ui, sans-serif`.
- **Numerics**: tabular numerals everywhere money or quantities appear
  (`font-variant-numeric: tabular-nums`).
- **Display**: same Inter family, just larger and tighter.

### Color tokens (in `src/styles.css` `@theme`)

| token | light | role |
| ----- | ----- | ---- |
| `--color-bg` | `oklch(0.99 0.005 95)` | page background (warm paper) |
| `--color-surface` | `oklch(1 0 0)` | cards, table rows |
| `--color-surface-2` | `oklch(0.97 0.005 95)` | striped row, hover |
| `--color-border` | `oklch(0.91 0.005 95)` | hairlines |
| `--color-ink` | `oklch(0.22 0.01 270)` | primary text (deep navy-black) |
| `--color-ink-soft` | `oklch(0.45 0.01 270)` | secondary text |
| `--color-ink-faint` | `oklch(0.62 0.01 270)` | tertiary text |
| `--color-brand` | `oklch(0.52 0.13 165)` | primary actions (deep green) |
| `--color-brand-soft` | `oklch(0.94 0.04 165)` | brand tint |
| `--color-positive` | `oklch(0.55 0.13 155)` | revenue, cash in |
| `--color-negative` | `oklch(0.55 0.18 25)` | expense, draws, void |
| `--color-warning` | `oklch(0.72 0.13 75)` | overdue, attention |

Dark mode is out of scope for MVP but tokens use OKLCH so a future dark theme
is a one-block swap.

### Spacing & rhythm

Tailwind's defaults; preferred rhythm `4 / 6 / 8 / 12 / 16` (px×0.25). Page
gutters: `px-8` on desktop, `px-4` mobile. Section vertical rhythm: `py-10`.

### Radii

`md=10px` (inputs, buttons), `lg=14px` (cards), `xl=20px` (modals). No
fully-rounded pills except for status badges.

### Elevation

Almost flat. Use a single soft shadow (`0 1px 2px rgb(0 0 0 / 0.04)`) on cards
and dropdowns only. Modals get a slightly stronger drop.

### Iconography

Inline SVGs (no icon library dependency for MVP). Stroke 1.5, currentColor.
Sized 16/18/20 to match text x-height.

### Tone of voice

Direct, warm, lowercase headlines where helpful ("today, this month, this
year"), Title Case for navigation labels. Never marketing-y. Numbers are
always formatted with locale and currency symbol (`Intl.NumberFormat`).

### Component primitives

Implemented from scratch (no external UI library) in `src/components/ui/`:

- `Button` (`intent`: brand | neutral | ghost | danger; `size`: sm | md)
- `Input`, `Textarea`, `Select`, `DateInput`
- `Card`, `Field` (label + input + help), `Stack`, `Inline`
- `Table` (semantic `<table>`, tabular nums, striped option)
- `Money` (renders cents as currency, color-aware)
- `Badge` (status pills)
- `Dialog` (native `<dialog>`)

### Layout (mobile-primary)

Three breakpoints: **compact** (&lt;640px) bottom tab bar + “More” sheet;
**comfortable** (640–1023px) icon rail; **spacious** (≥1024px) full 240px
sidebar. Page gutters: `px-4` / `px-6` / `px-8`. Touch targets ≥44px on
compact.

## 10. Open questions

- Per-user data isolation and roles — deferred.
- Real PDF invoice export — deferred (record exists, presentation later).
- Connecting a bank feed for true cash-flow reconciliation — deferred.
- Tax filing exports (Schedule C summary) — deferred but the data model
  supports it.
