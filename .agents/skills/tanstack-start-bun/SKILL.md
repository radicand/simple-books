---
name: tanstack-start-bun
description: Documents TanStack Start + Bun + Nitro stack layout, dev commands, and import-protection rules for simple-books. Use when scaffolding, building, debugging Vite/Start, or fixing client/server import errors.
---

# TanStack Start + Bun

See [versions](references/versions.md) for pinned package versions.

## Project layout

```
src/
  routeTree.gen.ts          # auto-generated; do not edit
  router.tsx                # exports `getRouter()` (NOT createRouter)
  styles.css                # Tailwind + @theme tokens
  routes/                   # file-based routing
    __root.tsx              # root document
    _app.tsx                # protected layout (beforeLoad checks session)
    _app/...                # children of layout
    api/auth/$.ts           # better-auth catch-all (server route)
  db/
    schema.ts               # business tables (CLIENT-SAFE)
    auth-schema.ts          # better-auth tables (CLIENT-SAFE)
    client.server.ts        # db connection (SERVER-ONLY, suffix matters)
  lib/                      # client-safe utilities
  server/                   # *.server.ts and *.functions.ts files
```

## Commands

```bash
bun install
bun run db:migrate && bun run db:seed
bun run dev                # vite dev on :3000 via bun --bun
bun run build              # produces .output/server
bun run start              # bun run .output/server/index.mjs
bun run db:reset           # wipes data/ and re-seeds
```

## Import protection (the big gotcha)

The Start plugin runs an `import-protection` check on the client bundle and
**denies** imports of:

- any module marked with `import '@tanstack/react-start/server-only'`
- any specifier matching `@tanstack/react-start/server` (the runtime request helpers)

This applies even when the denied import is *only* reached transitively from
a route via a `*.functions.ts` file. The plugin does NOT auto-whitelist
`createServerFn` files for these imports.

Two pieces solve this in practice:

1. **Use `createMiddleware().server(...)` for auth and request access.**
   The middleware body is the right place to call `getRequest()`, look up the
   session, etc. Attach with `.middleware([requireAuthMiddleware])`.
   The middleware factory output is a safe symbol — it can be imported from
   any file (including `*.functions.ts`).
2. **Dynamic-import DB and schema inside handler bodies.** E.g.
   `const { db } = await import('~/db/client')`. Top-level static imports of
   server-only modules from a `.functions.ts` file will fail the prod build.

See `src/lib/auth.functions.ts` for the middleware definitions used app-wide.
See [adding-a-server-fn](../adding-a-server-fn/SKILL.md) for the RPC recipe.

## Gotchas

- The router factory must export **`getRouter`** (not `createRouter`). Otherwise
  Start throws `entries.routerEntry.getRouter is not a function`.
- API routes go in `src/routes/api/...` and use `createFileRoute` with a
  `server.handlers.{GET,POST,...}` object. They are NOT `createServerFileRoute`
  in this version.
- `*.server.ts` suffix enforces server-only at build time. Put DB, secrets,
  and `bun:sqlite` behind it.
- Always prefix Vite with `bun --bun` (`bun --bun vite dev`). Without it Bun
  shells to Node.
- `serverFn({ method: 'POST' }).inputValidator((d) => z.parse(d)).handler(...)`
  — `inputValidator` replaced the old `.validator` in 1.168+.
- Auth **must** be enforced inside each `createServerFn` handler (or via
  middleware). Route `beforeLoad` does not protect the RPC.
- Use `getRequest()` from `@tanstack/react-start/server` to read headers.
- Drizzle Kit `generate` works under Bun (`bunx drizzle-kit generate`);
  migrations are applied by our own script using `bun:sqlite`.
