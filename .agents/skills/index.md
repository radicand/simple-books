# .agents/skills

Living folder of small, focused "how-to" notes that future iterations of this
agent (or a human) can read in seconds and act on. Each skill is a single
Markdown file describing one repeatable task — the goal is to short-circuit
re-research.

## When to add a skill

- After solving a non-obvious config issue.
- After establishing a repeatable workflow (e.g. "how we add a server
  function", "how we add an account to the chart of accounts").
- After picking a non-obvious convention (e.g. naming, file layout).

Keep skills under ~80 lines each. Link out for depth.

## Index

- `tanstack-start-bun.md` — scaffolding & dev/build commands for this stack.
- `accounting-posting.md` — how to post a new business event to the ledger.
- `adding-a-server-fn.md` — minimal recipe for a new `createServerFn` endpoint.
- `ui-components.md` — when to reach for which primitive in `components/ui`.
- `playing-with-playwright.md` — how to drive the app for smoke testing.
