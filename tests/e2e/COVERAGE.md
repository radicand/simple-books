# E2E coverage grid

Legend: **Y** = exercised in default `bun run test` · **—** = not covered · **S** = screenshots spec only (`bun run screenshots`)

Default suite: [`business-flow.spec.ts`](business-flow.spec.ts) (two serial tests, shared browser context + DB).

| Feature / surface | UI path | Default e2e | Notes |
|-------------------|---------|-------------|-------|
| **Auth** |
| First-owner signup | `/login` | Y | `business-flow` |
| Email sign-in | `/login` | Y | `lifecycle` (sign-in → sign-out → sign-in) |
| Sign-out | shell | Y | `lifecycle` |
| OIDC / SSO | `/login` | — | Requires IdP env |
| **Dashboard** |
| Stats & lists | `/dashboard` | Y | Cash on hand asserted |
| **Catalog** |
| Create service | `/services` | Y | |
| Edit / deactivate service | `/services` | — | |
| Create customer | `/customers` | Y | |
| Edit customer | `/customers` | — | |
| **Invoices** |
| Create (line items) | `/invoices/new` | Y | |
| View detail | `/invoices/$id` | Y | After create + void flow |
| Edit memo | `/invoices/$id/edit` | Y | |
| Void (no payments) | `/invoices/$id` | Y | `lifecycle` |
| Partial / over-payment | receipts | — | |
| Invoice attachments | `/invoices/new` | — | |
| **Payments** |
| Pay linked invoice | `/receipts/new` | Y | |
| Standalone → auto-invoice | `/receipts/new` | Y | |
| Receipt list | `/receipts` | Y | |
| Delete payment | `/receipts` | Y | `lifecycle` ($50 row) |
| Receipt detail / edit | `/receipts/$id` | — | |
| Payment attachments | `/receipts/new` | — | |
| **Mileage** |
| Log trip (modal) | `/mileage` | Y | |
| View mileage rates table | `/settings` | Y | `lifecycle` asserts 2026 @ 72.5¢ |
| Edit mileage rate | `/settings` | — | UI save not yet covered in e2e |
| Edit / delete trip | `/mileage/$id` | — | |
| Mileage attachments | `/mileage/$id` | Y | `mileage-attachment-upload` |
| **Reports** |
| Balance sheet + in balance | `/reports` | Y | |
| Cash flow (date range) | `/reports/cash-flow` | Y | |
| **Settings** |
| Mileage rates table | `/settings` | Y | Edit 2026 rate |
| S3 retention notice | `/settings` | — | Only when S3 enabled |
| **Screenshots** |
| README `docs/screens/*` | various | S | `@screenshots` only |
| **Infra** |
| Production server + `REFERENCE_DATE` build | harness | Y | `build:e2e` |
| PostgreSQL | — | — | Ephemeral SQLite only |
| Responsive breakpoints | — | — | See responsive-layout skill |

## When to update this grid

- Add a row when shipping a new route or materially new behavior.
- Set **Y** only when a default-suite test would fail if the feature regressed (not “page was visited incidentally”).
- Keep [`playing-with-playwright` skill](../../.agents/skills/playing-with-playwright/SKILL.md) runbook in sync for *how* to run tests; this file is the *what* we cover.
