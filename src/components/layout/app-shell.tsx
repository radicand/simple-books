import { Outlet, useRouter } from '@tanstack/react-router'
import { authClient } from '~/lib/auth-client'
import { BottomNav } from './bottom-nav'
import { SidebarNav } from './sidebar-nav'

export function AppShell({
  user,
}: {
  user: { name?: string | null; email: string }
}) {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-dvh flex bg-[var(--color-bg)]">
      {/* Spacious: full sidebar */}
      <div className="hidden lg:flex shrink-0">
        <SidebarNav user={user} onSignOut={handleSignOut} />
      </div>

      {/* Comfortable: icon rail */}
      <div className="hidden sm:flex lg:hidden shrink-0">
        <SidebarNav user={user} onSignOut={handleSignOut} iconOnly />
      </div>

      <div className="flex-1 flex flex-col min-w-0 pb-[calc(var(--nav-height-compact,56px)+env(safe-area-inset-bottom))] sm:pb-0">
        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav user={user} onSignOut={handleSignOut} />
    </div>
  )
}
