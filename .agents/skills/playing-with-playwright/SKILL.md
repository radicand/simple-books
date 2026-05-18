---
name: playing-with-playwright
description: Documents smoke test runbook, when to add tests, and Playwright selector pitfalls for simple-books. Use when running E2E tests, debugging flakes, or writing UI tests.
---

# Playwright smoke testing

Single test `tests/smoke.spec.ts` walks the happy path (signup → service → customer → invoice → payment → mileage → reports) and captures PR screenshots. One test, one DB reset.

## Running

Playwright starts a Vite dev server on a free port and a temporary SQLite database
(migrated + seeded); the DB directory is removed when the run finishes.

```bash
bun run test
# or full CI-style path (production build + chromium install):
bun run test:e2e
```

Debug flakes:

```bash
bun run test -- --headed --debug
bunx playwright show-trace test-results/.../trace.zip
```

## When to write more tests

NOT YET unless:

- Shipping a release
- Touching the posting engine (assert balance-sheet identities)
- A real bug recurs

Prefer UI happy-path tests over unit tests for plumbing.

## Selector tips

- Duplicate labels (e.g. "Add customer" on header and submit): `page.locator('form').getByRole(...)`
- Section headings as `<div>` are not `heading` role: use `getByText('…').first()`
- SSR: wait on unique field (`waitForSelector('#m-miles')`) or heading, not hydration timing

Responsive checklist: [responsive-layout](../responsive-layout/SKILL.md).
