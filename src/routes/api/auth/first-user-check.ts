import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/auth/first-user-check')({
  server: {
    handlers: {
      GET: async () => {
        const { countUsers } = await import('~/db/user-count')
        const count = await countUsers()
        return Response.json({ needsFirstUser: count === 0 })
      },
    },
  },
})
