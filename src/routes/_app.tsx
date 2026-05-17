import {
  Outlet,
  createFileRoute,
  redirect,
  Link,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { getSession } from '~/lib/auth.functions'
import { authClient } from '~/lib/auth-client'
import { Icon } from '~/components/ui'

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
  component: AppShell,
})

const NAV = [
  {
    group: 'Today',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: 'M3 12 12 4l9 8M5 10v10h14V10',
      },
    ],
  },
  {
    group: 'Money in',
    items: [
      {
        to: '/invoices',
        label: 'Invoices',
        icon: 'M6 3h9l4 4v14H6zM14 3v5h5M8 13h8M8 17h5',
      },
      {
        to: '/receipts',
        label: 'Cash receipts',
        icon: 'M4 6h16M4 12h16M4 18h10M19 18l3-3-3-3',
      },
    ],
  },
  {
    group: 'Setup',
    items: [
      {
        to: '/services',
        label: 'Service products',
        icon: 'M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z',
      },
      {
        to: '/customers',
        label: 'Customers',
        icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
      },
    ],
  },
  {
    group: 'Other',
    items: [
      {
        to: '/mileage',
        label: 'Mileage',
        icon: 'M3 17h2l1-4h12l1 4h2M5 17v3h3v-3M16 17v3h3v-3M7 13l1-5h8l1 5',
      },
      {
        to: '/reports',
        label: 'Reports',
        icon: 'M4 19V5M9 19V11M14 19V8M19 19V14M3 19h18',
      },
    ],
  },
] as const

function AppShell() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const path = useRouterState({ select: (s) => s.location.pathname })

  async function handleSignOut() {
    await authClient.signOut()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <aside className="w-[240px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        <div className="px-5 h-[60px] flex items-center gap-2 border-b border-[var(--color-border)]">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] bg-[var(--color-brand)] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h11a3 3 0 0 1 3 3v11" />
              <path d="M4 5v13a2 2 0 0 0 2 2h12" />
              <path d="M8 9h6M8 13h4" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">simple-books</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map((group) => (
            <div key={group.group} className="px-3 mb-5">
              <div className="px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-2">
                {group.group}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active =
                    path === item.to || path.startsWith(item.to + '/')
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] text-[13.5px] font-medium transition-colors ${
                        active
                          ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]'
                          : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]'
                      }`}
                    >
                      <Icon d={item.icon} size={16} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-[8px] hover:bg-[var(--color-surface-2)] group">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)] flex items-center justify-center text-[12px] font-semibold">
              {(user.name || user.email)
                .split(' ')
                .map((p: string) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{user.name}</div>
              <div className="text-[11px] text-[var(--color-ink-faint)] truncate">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-ink-faint)] hover:text-[var(--color-negative)]"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1200px] mx-auto px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
