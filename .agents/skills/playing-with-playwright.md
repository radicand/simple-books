# skill: smoke testing with Playwright

We keep a single test, `tests/smoke.spec.ts`, that walks the entire happy
path (signup → service → customer → invoice → payment → mileage → reports)
and takes the PR screenshots along the way. One test, one DB reset.

## Running

```bash
# 1. Wipe the DB and reseed the chart of accounts
bun run db:reset

# 2. Start the dev server in one terminal
bun run dev

# 3. In another terminal, run the test
bunx playwright test --project=chromium
```

To debug a flake, run with `--headed --debug` or open the trace:

```bash
bunx playwright show-trace test-results/.../trace.zip
```

## When to write more tests

NOT YET. The product is small and the UX is changing faster than the test
contracts would stabilize. Add focused tests only when:

- You're about to ship a release.
- You touch the posting engine — assert balance-sheet identities programmatically.
- A real bug recurs.

Always prefer testing the user-facing happy path through the UI over unit
tests for plumbing — the unit test won't catch a wired-wrong loader.

## Selector tips that bit us

- The same label (e.g. "Add customer") appears on both the header button and
  the form's submit button. Scope with `page.locator('form').getByRole(...)`.
- Section headings rendered as `<div>` are not `heading` role. Use
  `getByText('…').first()`.
- For SSR pages, prefer waiting on a unique field (`waitForSelector('#m-miles')`)
  or a unique heading rather than relying on hydration timing.
