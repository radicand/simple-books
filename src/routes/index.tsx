import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '~/lib/auth.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) throw redirect({ to: '/dashboard' })
    throw redirect({ to: '/login' })
  },
})
