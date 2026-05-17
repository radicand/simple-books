---
name: adding-a-server-fn
description: Creates TanStack Start createServerFn RPC endpoints with requireAuthMiddleware and dynamic server imports in simple-books. Use when adding *.functions.ts files, server mutations, or fixing import-protection build errors.
---

# Adding a server function

```ts
// src/server/foo.functions.ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'

const inputSchema = z.object({ name: z.string().min(1).max(120) })

export const createFoo = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { db } = await import('~/db/client')
    const { someTable } = await import('~/db/schema')
    const [row] = await db
      .insert(someTable)
      .values({ id: newId('foo'), name: data.name, userId: context.session.user.id })
      .returning()
    return row
  })
```

## Rules

- **Auth via middleware** — `requireAuthMiddleware` injects `session` into `context` and throws 401 if missing. Keeps `*.functions.ts` free of server-only static imports.
- **DB and server-only modules** — `await import('~/db/client')` inside the handler body only.
- Use `z.parse` inside `inputValidator` for typed callers.
- Mutations: `method: 'POST'`. Reads: `method: 'GET'`.
- Return JSON-serializable data — Date, Map, Set will not round-trip.
- Do NOT trust route `beforeLoad` for authorization; middleware re-checks every RPC.
- Transactions: `db.transaction((tx) => { ... })` — Drizzle bun-sqlite tx is synchronous.

Import-protection details: [tanstack-start-bun](../tanstack-start-bun/SKILL.md).

## Calling from a route loader

```ts
export const Route = createFileRoute('/_app/foos')({
  loader: () => listFoos(),
  component: FooPage,
})
```

## Calling from a component (after mount)

```ts
const result = await createFoo({ data: { name: 'Bar' } })
await router.invalidate()
```
