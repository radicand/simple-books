import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Icon } from '~/components/ui'
import { BOTTOM_NAV, MORE_NAV } from './nav-config'
import { NavLink } from './nav-link'

export function BottomNav({
  user,
  onSignOut,
}: {
  user?: { name?: string | null; email: string }
  onSignOut?: () => void
}) {
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = MORE_NAV.some(
    (i) => path === i.to || path.startsWith(i.to + '/'),
  )

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)] pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 h-[var(--nav-height-compact,56px)]">
          {BOTTOM_NAV.map((item) => {
            const active = path === item.to || path.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-11 text-[10px] font-medium ${
                  active
                    ? 'text-[var(--color-brand-ink)]'
                    : 'text-[var(--color-ink-faint)]'
                }`}
              >
                <Icon d={item.icon} size={20} />
                <span>{item.shortLabel ?? item.label}</span>
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-11 text-[10px] font-medium ${
              moreActive
                ? 'text-[var(--color-brand-ink)]'
                : 'text-[var(--color-ink-faint)]'
            }`}
            aria-label="More navigation"
          >
            <Icon d="M4 6h16M6 12h12M8 18h8" size={20} />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 max-h-none max-w-none w-full h-full bg-transparent p-0 sm:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-0 bg-[oklch(0.22_0.012_270/0.4)]"
            aria-hidden
          />
          <div
            className="absolute bottom-0 inset-x-0 bg-[var(--color-surface)] rounded-t-[20px] border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-pop)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-[var(--color-border)]">
              <span className="text-[15px] font-semibold">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-2 min-h-11 min-w-11 flex items-center justify-center rounded-[8px] hover:bg-[var(--color-surface-2)]"
                aria-label="Close"
              >
                <Icon d="M6 6l12 12M18 6 6 18" size={18} />
              </button>
            </div>
            {user && onSignOut && (
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{user.name}</div>
                  <div className="text-[11px] text-[var(--color-ink-faint)] truncate">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    onSignOut()
                  }}
                  className="text-[13px] text-[var(--color-negative)] font-medium min-h-11 px-3"
                >
                  Sign out
                </button>
              </div>
            )}
            <nav className="p-3 flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto">
              {MORE_NAV.map((item) => {
                const active =
                  path === item.to || path.startsWith(item.to + '/')
                return (
                  <NavLink
                    key={item.to}
                    item={item}
                    active={active}
                    onNavigate={() => setMoreOpen(false)}
                  />
                )
              })}
            </nav>
          </div>
        </dialog>
      )}
    </>
  )
}
