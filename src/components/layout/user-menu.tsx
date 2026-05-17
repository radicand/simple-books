import { Icon } from '~/components/ui'

export function UserMenu({
  user,
  onSignOut,
  compact,
}: {
  user: { name?: string | null; email: string }
  onSignOut: () => void
  compact?: boolean
}) {
  const initials = (user.name || user.email)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`px-3 py-3 border-t border-[var(--color-border)] ${compact ? '!py-2' : ''}`}
    >
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-[8px] hover:bg-[var(--color-surface-2)] group">
        <div className="w-8 h-8 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)] flex items-center justify-center text-[12px] font-semibold shrink-0">
          {initials}
        </div>
        {!compact && (
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{user.name}</div>
            <div className="text-[11px] text-[var(--color-ink-faint)] truncate">
              {user.email}
            </div>
          </div>
        )}
        <button
          onClick={onSignOut}
          className="shrink-0 p-2 -m-1 rounded-[8px] text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] hover:bg-[var(--color-surface-2)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-11 min-w-11 flex items-center justify-center"
          title="Sign out"
          aria-label="Sign out"
        >
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </button>
      </div>
    </div>
  )
}
