---
name: playing-with-playwright
description: Documents smoke test runbook, when to add tests, and Playwright selector pitfalls for simple-books. Use when running E2E tests, debugging flakes, or writing UI tests.
---

# Playwright smoke testing

Default suite (serial, one DB + browser context): [`business-flow.spec.ts`](../../../tests/e2e/business-flow.spec.ts) — bootstrap flow then lifecycle flow. Shared steps: [`sole-proprietor-flow.ts`](../../../tests/e2e/sole-proprietor-flow.ts), [`lifecycle-flow.ts`](../../../tests/e2e/lifecycle-flow.ts). **Coverage grid:** [`COVERAGE.md`](../../../tests/e2e/COVERAGE.md).

## Running

Requires an e2e production build (`REFERENCE_DATE` baked into the client bundle):

```bash
bun run build:e2e   # REFERENCE_DATE=2026-05-18 bun run build
bun run test        # ephemeral port, prod server, temp SQLite (migrate + seed)
```

Full local CI-style path (install + chromium):

```bash
bun run test:e2e
bun run test:e2e:quick    # skip build when .output is fresh
```

README screenshots in `docs/screens/` are opt-in only:

```bash
bun run screenshots
# equivalent: UPDATE_SCREENSHOTS=1 bun run test -- --grep @screenshots
```

Debug flakes:

```bash
bun run test -- --headed --debug
bunx playwright show-trace test-results/.../trace.zip
```

## Helpers

| Module | Use |
|--------|-----|
| [`tests/e2e/helpers/ui.ts`](../../../tests/e2e/helpers/ui.ts) | `waitForRoute`, `openModal`, `signUpOwner`, `visibleText` |
| [`tests/e2e/helpers/ledger.ts`](../../../tests/e2e/helpers/ledger.ts) | IRS mileage rate, `formatUsd`, expected cash cents |
| [`tests/e2e/helpers/auth.ts`](../../../tests/e2e/helpers/auth.ts) | `E2E_OWNER` credentials |
| [`tests/e2e/COVERAGE.md`](../../../tests/e2e/COVERAGE.md) | What is / is not tested |

## When to write more tests

NOT YET unless:

- Shipping a release
- Touching the posting engine (assert balance-sheet identities)
- A real bug recurs

Prefer UI happy-path tests over unit tests for plumbing.

## Selector tips

- Duplicate labels (e.g. "Add customer" on header and submit): `page.locator('form').getByRole(...)`
- Section headings as `<motion.div>` are not `heading` role: use `getByText('…').first()`
- SSR: wait on unique field (`#m-miles`, `#svc-name`) or empty-state copy, not hydration timing
- Sign-up: wait for `/sign-up` POST response before asserting `/dashboard`
- Do not use `networkidle` on SSR navigations

Responsive checklist: [responsive-layout](../responsive-layout/SKILL.md).
