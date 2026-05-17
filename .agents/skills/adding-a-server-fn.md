# skill: adding a new server function

The minimal recipe.

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
    // context.session is guaranteed by the middleware.
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

- **Auth via middleware**, not by calling helper functions at the top of files.
  `requireAuthMiddleware` injects `session` into `context` and throws 401 if missing.
  This pattern keeps `*.functions.ts` files free of server-only static imports
  (which the import-protection plugin would reject).
- **DB and other server-only modules** must be imported **inside the handler body**
  via `await import('~/db/client')`. The handler body is stripped from the
  client bundle; top-level imports are not.
- Use `z.parse` inside `inputValidator` so callers get a typed result.
- Mutations: `method: 'POST'`. Reads: `method: 'GET'`.
- Return plain JSON-serializable data — Date, Map, Set will not round-trip.
- Do NOT trust authorization derived from route guards. The middleware re-checks
  on every RPC call.
- If you need a transaction, wrap with `db.transaction((tx) => { ... })` — Drizzle's
  bun-sqlite tx is synchronous.

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
await router.invalidate()  // refetch loaders
```
