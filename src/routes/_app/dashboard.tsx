import { createFileRoute, Link } from '@tanstack/react-router'
import {
  PageHeader,
  Card,
  CardBody,
  Money,
  Badge,
  Button,
  Icon,
} from '~/components/ui'
import { fmtDate, fmtDateLong, referenceNow, todayISO } from '~/lib/date'
import { getDashboard } from '~/server/dashboard.functions'

export const Route = createFileRoute('/_app/dashboard')({
  loader: () => getDashboard(),
  component: Dashboard,
})

function Dashboard() {
  const data = Route.useLoaderData()
  const greeting = greetingFor(referenceNow())

  return (
    <>
      <PageHeader
        title={`${greeting}.`}
        subtitle={fmtDateLong(todayISO())}
        actions={
          <>
            <Link to="/receipts/new">
              <Button intent="neutral">
                <Icon d="M12 4v16M4 12h16" size={16} /> Log payment
              </Button>
            </Link>
            <Link to="/invoices/new">
              <Button intent="brand">
                <Icon d="M12 4v16M4 12h16" size={16} /> New invoice
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Cash on hand" cents={data.cashCents} tone="positive" />
        <Stat label="Outstanding A/R" cents={data.arCents} tone={data.arCents > 0 ? 'warning' : 'muted'} />
        <Stat label="Revenue this year" cents={data.revenueYtdCents} />
        <Stat label="Expenses this year" cents={data.expensesYtdCents} tone="negative" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold tracking-tight">Open invoices</h3>
            <Link to="/invoices" className="text-[12px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              See all →
            </Link>
          </div>
          <CardBody className="!p-0">
            {data.openInvoices.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-soft)]">
                No open invoices.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.openInvoices.map((i) => (
                  <li key={i.id} className="px-5 py-3 flex items-center justify-between text-sm hover:bg-[var(--color-surface-2)]/60">
                    <div className="min-w-0">
                      <Link to="/invoices/$id" params={{ id: i.id }} className="font-medium hover:underline">
                        {i.number}
                      </Link>
                      <span className="text-[var(--color-ink-faint)]"> · </span>
                      <span className="text-[var(--color-ink-soft)]">{i.customerName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[var(--color-ink-faint)]">
                        due {fmtDate(i.dueOn)}
                      </span>
                      <Money cents={i.balanceCents} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold tracking-tight">Recent cash receipts</h3>
            <Link to="/receipts" className="text-[12px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              See all →
            </Link>
          </div>
          <CardBody className="!p-0">
            {data.recentReceipts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-ink-soft)]">
                No payments logged yet.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentReceipts.map((r) => (
                  <li key={r.id} className="px-5 py-3 flex items-center justify-between text-sm hover:bg-[var(--color-surface-2)]/60">
                    <div className="min-w-0 flex items-center gap-3">
                      <Badge tone="positive">{r.method}</Badge>
                      <span className="text-[var(--color-ink)]">{r.customerName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[var(--color-ink-faint)]">{fmtDate(r.receivedOn)}</span>
                      <Money cents={r.amountCents} tone="positive" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {data.openInvoices.length === 0 &&
        data.recentReceipts.length === 0 &&
        data.cashCents === 0 && (
          <Card className="mt-6">
            <CardBody>
              <h3 className="text-[14px] font-semibold mb-2">Get started</h3>
              <ol className="text-sm text-[var(--color-ink-soft)] list-decimal pl-5 space-y-1">
                <li>
                  Add a <Link to="/services" className="text-[var(--color-brand)] hover:underline">service product</Link> (e.g. "Consulting hour @ $150").
                </li>
                <li>
                  Add a <Link to="/customers" className="text-[var(--color-brand)] hover:underline">customer</Link>.
                </li>
                <li>
                  Create your first <Link to="/invoices/new" className="text-[var(--color-brand)] hover:underline">invoice</Link>, then{' '}
                  <Link to="/receipts/new" className="text-[var(--color-brand)] hover:underline">log the payment</Link> when it arrives.
                </li>
                <li>
                  Track <Link to="/mileage" className="text-[var(--color-brand)] hover:underline">business mileage</Link> as you drive.
                </li>
              </ol>
            </CardBody>
          </Card>
        )}
    </>
  )
}

function Stat({
  label,
  cents,
  tone,
}: {
  label: string
  cents: number
  tone?: 'positive' | 'negative' | 'warning' | 'muted'
}) {
  return (
    <Card>
      <CardBody className="!p-4">
        <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
          {label}
        </div>
        <div className="mt-2 text-[22px] font-semibold tracking-tight">
          <Money
            cents={cents}
            tone={
              tone === 'warning'
                ? undefined
                : (tone as 'positive' | 'negative' | 'muted' | undefined)
            }
          />
        </div>
        {tone === 'warning' && cents > 0 && (
          <div className="mt-1.5">
            <Badge tone="warning">Awaiting payment</Badge>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 5) return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
