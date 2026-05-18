import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type HTMLAttributes,
} from 'react'

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                  */
/* -------------------------------------------------------------------------- */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* -------------------------------------------------------------------------- */
/*  Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  intent?: 'brand' | 'neutral' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ intent = 'neutral', size = 'md', full, className, ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap'
    const sizes = {
      sm: 'h-8 px-3 text-[13px]',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-5 text-[15px]',
    }[size]
    const intents = {
      brand:
        'bg-[var(--color-brand)] text-white border-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] hover:border-[var(--color-brand-hover)] shadow-[0_1px_0_oklch(0_0_0/0.04)]',
      neutral:
        'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border-strong)] hover:bg-[var(--color-surface-2)]',
      ghost:
        'bg-transparent text-[var(--color-ink)] border-transparent hover:bg-[var(--color-surface-2)]',
      danger:
        'bg-[var(--color-surface)] text-[var(--color-negative)] border-[var(--color-border-strong)] hover:bg-[var(--color-danger-surface)]',
    }[intent]
    return (
      <button
        ref={ref}
        className={cx(base, sizes, intents, full && 'w-full', className)}
        {...rest}
      />
    )
  },
)
Button.displayName = 'Button'

/* -------------------------------------------------------------------------- */
/*  Input / Textarea / Select / DateInput                                     */
/* -------------------------------------------------------------------------- */

const fieldBase =
  'block w-full rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] disabled:bg-[var(--color-surface-2)] disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...rest }, ref) => (
    <input ref={ref} type={type} className={cx(fieldBase, className)} {...rest} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={cx(fieldBase, 'min-h-[80px]', className)} {...rest} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={cx(
        fieldBase,
        'select-control pr-9 appearance-none bg-no-repeat bg-[length:18px_18px] bg-[right_8px_center]',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

/* -------------------------------------------------------------------------- */
/*  Field wrapper (label + control + help/error)                              */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-[var(--color-ink)]">
          {label}
          {required && <span className="text-[var(--color-negative)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-[var(--color-negative)]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--color-ink-faint)]">{hint}</p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', className)} {...rest} />
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3',
        className,
      )}
      {...rest}
    />
  )
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx('text-[15px] font-semibold tracking-tight', className)} {...rest} />
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('p-5', className)} {...rest} />
}

/* -------------------------------------------------------------------------- */
/*  Badge                                                                      */
/* -------------------------------------------------------------------------- */

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'brand'
  children: ReactNode
  className?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] border-[var(--color-border)]',
    positive:
      'bg-[var(--color-badge-positive-bg)] text-[var(--color-positive)] border-[var(--color-badge-positive-border)]',
    negative:
      'bg-[var(--color-badge-negative-bg)] text-[var(--color-negative)] border-[var(--color-badge-negative-border)]',
    warning:
      'bg-[var(--color-badge-warning-bg)] text-[var(--color-badge-warning-ink)] border-[var(--color-badge-warning-border)]',
    info: 'bg-[var(--color-badge-info-bg)] text-[var(--color-info)] border-[var(--color-badge-info-border)]',
    brand:
      'bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)] border-[var(--color-badge-brand-border)]',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 h-[22px] text-[11px] font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  Money cell                                                                 */
/* -------------------------------------------------------------------------- */

import { fmtCents } from '~/lib/money'

export function Money({
  cents,
  tone,
  className,
  zeroDash = false,
}: {
  cents: number
  tone?: 'positive' | 'negative' | 'muted'
  className?: string
  zeroDash?: boolean
}) {
  if (zeroDash && cents === 0) {
    return <span className={cx('tabular text-[var(--color-ink-faint)]', className)}>—</span>
  }
  const color =
    tone === 'positive'
      ? 'text-[var(--color-positive)]'
      : tone === 'negative'
        ? 'text-[var(--color-negative)]'
        : tone === 'muted'
          ? 'text-[var(--color-ink-soft)]'
          : ''
  return <span className={cx('tabular', color, className)}>{fmtCents(cents)}</span>
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                      */
/* -------------------------------------------------------------------------- */

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cx('w-full text-sm', className)} {...rest} />
    </div>
  )
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cx(
        'text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] text-left',
        className,
      )}
      {...rest}
    />
  )
}

export function Th({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        'px-4 py-2 font-medium border-b border-[var(--color-border)] bg-[var(--color-surface-2)]',
        className,
      )}
      {...rest}
    />
  )
}

export function Tr({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cx(
        'border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)]/60 transition-colors',
        className,
      )}
      {...rest}
    />
  )
}

export function Td({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx('px-4 py-3 text-[var(--color-ink)]', className)} {...rest} />
}

/* -------------------------------------------------------------------------- */
/*  Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="text-[15px] font-medium text-[var(--color-ink)]">{title}</div>
      {hint && <div className="mt-1.5 text-sm text-[var(--color-ink-soft)] max-w-md">{hint}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page header                                                                */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--color-ink-soft)] mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto [&_button]:min-h-11">
          {actions}
        </div>
      )}
    </header>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inline icon                                                                */
/* -------------------------------------------------------------------------- */

export function Icon({
  d,
  size = 18,
  className,
  filled = false,
}: {
  d: string
  size?: number
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}
