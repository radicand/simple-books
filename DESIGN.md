---
version: alpha
name: simple-books
description: Calm double-entry bookkeeping for sole proprietors — warm paper, deep ink, restrained green brand.
colors:
  primary: "#2B2D36"
  secondary: "#5E6069"
  tertiary: "#1A7A5C"
  tertiary-hover: "#156B50"
  on-tertiary: "#FFFFFF"
  neutral: "#FDFCF9"
  surface: "#FFFFFF"
  surface-muted: "#F7F6F2"
  border: "#E5E4DF"
  border-strong: "#D0CFC9"
  ink-faint: "#8A8C94"
  brand-soft: "#E8F4EF"
  brand-ink: "#0D4D3A"
  positive: "#0D5C40"
  positive-bg: "#E8F5EE"
  negative: "#C43D2F"
  negative-bg: "#FCEEEC"
  warning: "#7A5A08"
  warning-bg: "#FDF8EC"
  info: "#2E5A9E"
  info-bg: "#EEF3FB"
typography:
  headline:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: "600"
    lineHeight: 1.2
    letterSpacing: -0.02em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 1.4
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 1.2
    letterSpacing: 0.06em
rounded:
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter-compact: 16px
  gutter-comfortable: 24px
  gutter-spacious: 32px
components:
  button-brand:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 16px
  button-brand-hover:
    backgroundColor: "{colors.tertiary-hover}"
    textColor: "{colors.on-tertiary}"
  button-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 16px
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 20px
  badge-positive:
    backgroundColor: "{colors.positive-bg}"
    textColor: "{colors.positive}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-negative:
    backgroundColor: "{colors.negative-bg}"
    textColor: "{colors.negative}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 4px
  badge-brand:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: 4px
  text-secondary:
    textColor: "{colors.secondary}"
    typography: "{typography.body-md}"
  text-faint:
    textColor: "{colors.ink-faint}"
    typography: "{typography.body-md}"
  page-canvas:
    backgroundColor: "{colors.neutral}"
  table-header:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-caps}"
  table-row-hover:
    backgroundColor: "{colors.surface-muted}"
  field-border:
    backgroundColor: "{colors.border}"
  field-border-strong:
    backgroundColor: "{colors.border-strong}"
---

# Simple-Books — Design Document

> Google-style design doc covering goals, non-goals, architecture, data model,
> security posture, and visual design system. Source of truth for design
> consistency across iterations. Keep this terse and current.
>
> Visual tokens follow the [DESIGN.md format](https://github.com/google-labs-code/design.md)
> (YAML front matter + sections below). Implementation lives in
> [`src/styles.css`](src/styles.css) as OKLCH CSS variables.

## Overview

Calm, considered, paper-like. The aesthetic of a beautifully-laid-out
accountant's ledger, not a SaaS dashboard. Generous whitespace, restrained
color, confident typography. The product should feel trustworthy on first load
for non-accountants recording real double-entry books.

## Colors

Warm paper backgrounds, deep ink text, and a single restrained green for primary
actions. Semantic greens/reds/ambers carry revenue, expense, and attention — never
raw color on body copy.

| Role | Token (CSS) | Light (OKLCH) |
| ---- | ----------- | ------------- |
| Page background | `--color-bg` | `oklch(0.99 0.005 95)` |
| Cards / inputs | `--color-surface` | `oklch(1 0 0)` |
| Striped / hover | `--color-surface-2` | `oklch(0.972 0.006 95)` |
| Hairlines | `--color-border` | `oklch(0.91 0.006 95)` |
| Primary text | `--color-ink` | `oklch(0.22 0.012 270)` |
| Secondary text | `--color-ink-soft` | `oklch(0.45 0.012 270)` |
| Tertiary text | `--color-ink-faint` | `oklch(0.62 0.012 270)` |
| Primary actions | `--color-brand` | `oklch(0.5 0.11 165)` |
| Revenue / cash in | `--color-positive` | `oklch(0.55 0.13 155)` |
| Expense / void | `--color-negative` | `oklch(0.55 0.18 25)` |
| Attention | `--color-warning` | `oklch(0.7 0.13 75)` |

**Dark mode (system only):** follows `prefers-color-scheme: dark` — no in-app
theme toggle, no `localStorage`. The same `--color-*` names are reassigned in
`@media (prefers-color-scheme: dark)` on `:root`; `color-scheme: light dark` in
CSS and `<meta name="color-scheme" content="light dark">`. Semantic tokens
(`--color-scrim`, badge/alert surfaces) also swap in that block.

YAML hex values above are sRGB approximations for agents and `npx @google/design.md lint`;
authoritative runtime values are OKLCH in `src/styles.css`.

## Typography

- **UI sans:** Inter (`--font-sans`), with `ss01` and `cv11` features on body.
- **Numerics:** tabular figures on all money and quantities (`font-variant-numeric: tabular-nums` / `.tabular`).
- **Scale:** page titles ~20–22px semibold; card titles 15px; body 13–14px; table headers 11px uppercase.

## Layout

Mobile-primary responsive shell (see [`app-shell.tsx`](src/components/layout/app-shell.tsx)):

| Zone | Breakpoint | Navigation |
| ---- | ---------- | ---------- |
| compact | default, &lt;640px | Bottom tab bar + More sheet |
| comfortable | 640–1023px | 56px icon rail |
| spacious | ≥1024px | 240px labeled sidebar |

Page max-width 1200px. Gutters: `px-4` / `px-6` / `px-8`. Touch targets ≥44px on compact.
Preferred spacing rhythm: 4 / 8 / 16 / 24 / 32px (`spacing.*` tokens).

## Elevation & Depth

Almost flat. Cards use `--shadow-card` (subtle 1px lift + hairline). Modals and
popovers use `--shadow-pop`. Overlays use `--color-scrim` with light backdrop blur.
Dark mode reduces harsh shadows and uses softer scrims.

## Shapes

`rounded.md` (10px) for inputs and buttons; `rounded.lg` (14px) for cards;
`rounded.xl` (20px) for modals. Status badges only use `rounded.full` pills.

## Components

Primitives in [`src/components/ui/index.tsx`](src/components/ui/index.tsx) — no
external UI library:

| Primitive | Notes |
| --------- | ----- |
| `Button` | `intent`: brand \| neutral \| ghost \| danger |
| `Input`, `Textarea`, `Select` | Native controls; select chevron via `.select-control` |
| `Card`, `Field` | Bordered containers and labeled fields |
| `Table`, `Money`, `Badge` | Tabular money; status pills use semantic badge tokens |
| `ModalDialog` | In `services.tsx`; scrim uses `--color-scrim` |

Front-matter `components.*` entries map to these intents for linting and agent guidance.

## Do's and Don'ts

- **Do** use `var(--color-*)` tokens — never hardcode OKLCH in route or layout files.
- **Do** respect system light/dark only; never add a theme chooser.
- **Do** use `Money` and `Badge` for currency and status — not ad-hoc text colors.
- **Do** keep WCAG AA contrast when adding new surfaces (lint with `bun run design:lint`).
- **Don't** use charts, neon accents, or dense dashboard layouts in MVP.
- **Don't** mix sharp and soft radii on the same view (stick to md/lg/xl scale).

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

## 9. Open questions

- Per-user data isolation and roles — deferred.
- Real PDF invoice export — deferred (record exists, presentation later).
- Connecting a bank feed for true cash-flow reconciliation — deferred.
- Tax filing exports (Schedule C summary) — deferred but the data model
  supports it.
