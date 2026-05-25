import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Card,
  CardBody,
  Money,
  Field,
  Input,
  Button,
  Icon,
} from '~/components/ui'
import { getBalanceSheet } from '~/server/reports.functions'
import { fmtDateLong, todayISO } from '~/lib/date'

export const Route = createFileRoute('/_app/reports/')({
  loader: () => getBalanceSheet({ data: { asOf: todayISO() } }),
  staleTime: 0,
  component: BalanceSheetPage,
})

function BalanceSheetPage() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial)
  const [asOf, setAsOf] = useState(initial.asOf)
  const [busy, setBusy] = useState(false)

  // Router intent-preload can mount with cached loader data; keep in sync on refetch.
  useEffect(() => {
    setData(initial)
    setAsOf(initial.asOf)
  }, [initial])

  async function reload() {
    setBusy(true)
    try {
      setData(await getBalanceSheet({ data: { asOf } }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="!py-3 flex items-end justify-between gap-3">
          <Field label="As of" htmlFor="bs-asof">
            <Input
              id="bs-asof"
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              className="w-[180px]"
            />
          </Field>
          <Button intent="neutral" onClick={reload} disabled={busy}>
            <Icon d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" size={16} />
            {busy ? 'Loading…' : 'Refresh'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-[var(--color-border)] text-center">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
            Balance Sheet
          </div>
          <div className="text-[20px] font-semibold tracking-tight">
            As of {fmtDateLong(data.asOf)}
          </div>
        </div>

        <CardBody className="!p-0">
          <Section title="Assets" rows={data.assets.map((a) => ({ label: a.name, cents: a.balance }))} total={data.totals.assets} totalLabel="Total assets" />

          <Section
            title="Liabilities"
            rows={data.liabilities.length === 0 ? [{ label: 'No liabilities', cents: 0, muted: true }] : data.liabilities.map((a) => ({ label: a.name, cents: a.balance }))}
            total={data.totals.liabilities}
            totalLabel="Total liabilities"
          />

          <Section
            title="Equity"
            rows={[
              ...data.equity.map((a) => ({ label: a.name, cents: a.balance })),
              {
                label: 'Retained earnings (YTD)',
                cents: data.retainedEarnings,
                muted: data.retainedEarnings === 0,
              },
            ]}
            total={data.totals.equity}
            totalLabel="Total equity"
          />

          <div className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)]">
            <Row
              label="Liabilities + Equity"
              cents={data.totals.liabilitiesPlusEquity}
              bold
              className="px-6 py-4 text-[15px]"
            />
            <div className="px-6 py-3 text-[12.5px] flex items-center justify-end gap-2 text-[var(--color-ink-soft)]">
              {data.totals.balances ? (
                <>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-positive)] text-white">
                    <Icon d="M5 12l5 5L20 7" size={12} />
                  </span>
                  In balance
                </>
              ) : (
                <span className="text-[var(--color-negative)]">
                  Out of balance by <Money cents={data.totals.difference} />
                </span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Section({
  title,
  rows,
  total,
  totalLabel,
}: {
  title: string
  rows: Array<{ label: string; cents: number; muted?: boolean }>
  total: number
  totalLabel: string
}) {
  return (
    <div>
      <div className="px-6 pt-5 pb-2 text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
        {title}
      </div>
      <ul className="list-none">
        {rows.map((r) => (
          <Row key={r.label} label={r.label} cents={r.cents} muted={r.muted} />
        ))}
      </ul>
      <div className="border-t border-[var(--color-border)] mx-6" />
      <Row label={totalLabel} cents={total} bold className="px-6 py-3 text-[14.5px]" />
    </div>
  )
}

function Row({
  label,
  cents,
  bold,
  muted,
  className,
}: {
  label: string
  cents: number
  bold?: boolean
  muted?: boolean
  className?: string
}) {
  const base = `flex items-center justify-between list-none ${
    muted ? 'text-[var(--color-ink-faint)]' : 'text-[var(--color-ink)]'
  }`
  return (
    <li className={`${base} ${className ?? 'px-6 py-2 text-sm'}`}>
      <span className={bold ? 'font-semibold' : ''}>{label}</span>
      <span className={`tabular ${bold ? 'font-semibold' : ''}`}>
        {muted && cents === 0 ? '—' : <Money cents={cents} />}
      </span>
    </li>
  )
}
