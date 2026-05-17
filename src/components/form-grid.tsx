import type { ReactNode } from 'react'
import { cx } from '~/components/ui'

/** Responsive field row: single column on compact, multi-column from `sm`. */
export function FormGrid({
  children,
  cols = 2,
  className,
}: {
  children: ReactNode
  cols?: 2 | 3
  className?: string
}) {
  const colClass =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2'
  return <div className={cx('grid gap-4', colClass, className)}>{children}</div>
}
