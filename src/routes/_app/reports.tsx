import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '~/components/ui'

export const Route = createFileRoute('/_app/reports')({
  component: ReportsLayout,
})

function ReportsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname })

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Where your money is and how it moved. Plain tables, no charts."
      />

      <div className="flex items-center gap-1 border-b border-[var(--color-border)] mb-6">
        <Tab to="/reports" active={path === '/reports'}>Balance Sheet</Tab>
        <Tab to="/reports/cash-flow" active={path.startsWith('/reports/cash-flow')}>Cash Flow</Tab>
      </div>

      <Outlet />
    </>
  )
}

function Tab({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2.5 text-[13.5px] font-medium border-b-2 -mb-px ${
        active
          ? 'border-[var(--color-brand)] text-[var(--color-ink)]'
          : 'border-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
      }`}
    >
      {children}
    </Link>
  )
}
