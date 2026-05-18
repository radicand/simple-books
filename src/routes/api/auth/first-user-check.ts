import { createFileRoute } from '@tanstack/react-router'
import { countUsers } from '~/db/user-count'

export const Route = createFileRoute('/api/auth/first-user-check')({
  server: {
    handlers: {
      GET: async () => {
        const count = await countUsers()
        return Response.json({ needsFirstUser: count === 0 })
      },
    },
  },
})
