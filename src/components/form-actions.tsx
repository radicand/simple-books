import type { ReactNode } from 'react'
import { cx } from '~/components/ui'

/** Primary form footer: full-width stacked buttons on compact. */
export function FormActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2',
        '[&_a]:block [&_button]:w-full sm:[&_button]:w-auto sm:[&_a]:w-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
