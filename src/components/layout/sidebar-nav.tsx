import { useRouterState } from '@tanstack/react-router'
import { BrandMark } from './brand-mark'
import { NavLink } from './nav-link'
import { NAV_GROUPS } from './nav-config'
import { UserMenu } from './user-menu'

export function SidebarNav({
  user,
  onSignOut,
  iconOnly = false,
}: {
  user: { name?: string | null; email: string }
  onSignOut: () => void
  iconOnly?: boolean
}) {
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside
      className={`shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-full ${
        iconOnly ? 'w-14' : 'w-[240px]'
      }`}
    >
      <BrandMark compact={iconOnly} />
      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="px-3 mb-5">
            {!iconOnly && (
              <div className="px-2 text-[10.5px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-2">
                {group.group}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  path === item.to || path.startsWith(`${item.to}/`)
                return (
                  <NavLink
                    key={item.to}
                    item={item}
                    active={active}
                    showLabel={!iconOnly}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <UserMenu user={user} onSignOut={onSignOut} compact={iconOnly} />
    </aside>
  )
}
