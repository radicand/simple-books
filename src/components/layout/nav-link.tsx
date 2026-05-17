import { Link } from '@tanstack/react-router'
import { Icon } from '~/components/ui'
import type { NavItem } from './nav-config'

export function NavLink({
  item,
  active,
  showLabel = true,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  showLabel?: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 px-2 py-2 rounded-[8px] text-[13.5px] font-medium transition-colors min-h-11 ${
        active
          ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)]'
          : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]'
      } ${!showLabel ? 'justify-center px-0' : ''}`}
      title={!showLabel ? item.label : undefined}
    >
      <Icon d={item.icon} size={showLabel ? 16 : 20} />
      {showLabel && <span className="truncate">{item.label}</span>}
    </Link>
  )
}
