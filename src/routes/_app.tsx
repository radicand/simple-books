import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '~/components/layout/app-shell'
import { getSession } from '~/lib/auth.functions'

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user: session.user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()
  return <AppShell user={user} />
}
