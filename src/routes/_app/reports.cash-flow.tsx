import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Card,
  CardBody,
  Money,
  Field,
  Input,
  Button,
  Table,
  THead,
  Th,
  Tr,
  Td,
  Icon,
  Badge,
} from '~/components/ui'
import { getCashFlow } from '~/server/reports.functions'
import { fmtDate, fmtDateLong, todayISO } from '~/lib/date'

function defaultFromTo() {
  const today = todayISO()
  const start = `${today.slice(0, 4)}-01-01`
  return { from: start, to: today }
}

export const Route = createFileRoute('/_app/reports/cash-flow')({
  loader: () => {
    const { from, to } = defaultFromTo()
    return getCashFlow({ data: { from, to } })
  },
  component: CashFlowPage,
})

function CashFlowPage() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [busy, setBusy] = useState(false)

  async function reload() {
    setBusy(true)
    try {
      setData(await getCashFlow({ data: { from, to } }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="!py-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <Field label="From" htmlFor="cf-from">
              <Input
                id="cf-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full sm:w-[180px]"
              />
            </Field>
            <Field label="To" htmlFor="cf-to">
              <Input
                id="cf-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full sm:w-[180px]"
              />
            </Field>
          </div>
          <Button intent="neutral" onClick={reload} disabled={busy} className="w-full sm:w-auto">
            <Icon d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" size={16} />
            {busy ? 'Loading…' : 'Refresh'}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <div className="px-6 py-5 border-b border-[var(--color-border)] text-center">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
            Cash Flow
          </div>
          <div className="text-[17px] sm:text-[20px] font-semibold tracking-tight">
            {fmtDateLong(data.from)} → {fmtDateLong(data.to)}
          </div>
        </div>

        <CardBody className="!p-0">
          <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
            <Stat label="Opening cash" cents={data.opening} />
            <Stat label="Inflows" cents={data.totalIn} tone="positive" />
            <Stat label="Outflows" cents={-data.totalOut} tone="negative" />
            <Stat label="Closing cash" cents={data.closing} bold />
          </div>

          <div className="px-6 pt-5 pb-2 text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
            Operating inflows
          </div>
          {data.inflows.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-[var(--color-ink-faint)]">
              No payments received in this period.
            </div>
          ) : (
            <>
              <div className="sm:hidden divide-y divide-[var(--color-border)]">
                {data.inflows.map((r: any) => (
                  <div key={r.id} className="px-4 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{r.customerName ?? '—'}</div>
                        <div className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
                          {fmtDate(r.date)}
                        </div>
                      </div>
                      <Money cents={r.amountCents} tone="positive" className="font-semibold shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="neutral">{r.method}</Badge>
                      {r.memo && (
                        <span className="text-[13px] text-[var(--color-ink-soft)]">{r.memo}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 flex items-center justify-between bg-[var(--color-surface-2)] border-t-2 border-[var(--color-border-strong)]">
                  <span className="uppercase tracking-wider text-[11px] text-[var(--color-ink-faint)] font-semibold">
                    Total inflows
                  </span>
                  <Money cents={data.totalIn} tone="positive" className="font-semibold" />
                </div>
              </div>
              <div className="hidden sm:block">
                <Table>
                  <THead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Customer</Th>
                      <Th>Method</Th>
                      <Th>Memo</Th>
                      <Th className="text-right">Amount</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {data.inflows.map((r: any) => (
                      <Tr key={r.id}>
                        <Td className="text-[var(--color-ink-soft)]">{fmtDate(r.date)}</Td>
                        <Td>{r.customerName ?? '—'}</Td>
                        <Td>
                          <Badge tone="neutral">{r.method}</Badge>
                        </Td>
                        <Td className="text-[var(--color-ink-soft)]">{r.memo || '—'}</Td>
                        <Td className="text-right">
                          <Money cents={r.amountCents} tone="positive" />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)]">
                      <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider text-[11px] text-[var(--color-ink-faint)] font-semibold">
                        Total inflows
                      </td>
                      <td className="px-4 py-3 text-right tabular font-semibold">
                        <Money cents={data.totalIn} tone="positive" />
                      </td>
                    </tr>
                  </tfoot>
                </Table>
              </div>
            </>
          )}

          <div className="px-6 pt-6 pb-2 text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-semibold">
            Operating outflows
          </div>
          <div className="px-6 pb-6 text-sm text-[var(--color-ink-faint)]">
            Cash outflows are not yet tracked. Mileage is recorded as an Owner's Contribution
            (non-cash equity), so it does not appear here.
          </div>

          <div className="px-6 py-4 border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)] flex items-center justify-between">
            <span className="text-sm font-semibold">Net change in cash</span>
            <span className="tabular text-[16px] font-semibold">
              <Money cents={data.net} tone={data.net >= 0 ? 'positive' : 'negative'} />
            </span>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function Stat({ label, cents, tone, bold }: { label: string; cents: number; tone?: 'positive' | 'negative'; bold?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1.5">
        {label}
      </div>
      <div className={`tabular ${bold ? 'text-[19px] font-semibold' : 'text-[17px] font-medium'}`}>
        <Money cents={cents} tone={tone} />
      </div>
    </div>
  )
}
