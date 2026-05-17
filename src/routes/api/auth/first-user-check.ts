import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'
import { db } from '~/db/client.server'

export const Route = createFileRoute('/api/auth/first-user-check')({
  server: {
    handlers: {
      GET: async () => {
        const rows = (await db.all(
          sql`SELECT COUNT(*) as c FROM user`,
        )) as Array<{ c: number }>
        const count = Number(rows[0]?.c ?? 0)
        return Response.json({ needsFirstUser: count === 0 })
      },
    },
  },
})
