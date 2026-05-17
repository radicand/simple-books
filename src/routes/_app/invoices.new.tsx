import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Icon,
  Money,
} from '~/components/ui'
import { listCustomers } from '~/server/customers.functions'
import { listServices } from '~/server/services.functions'
import { createInvoice } from '~/server/invoices.functions'
import { todayISO, addDaysISO } from '~/lib/date'
import { parseDollarsToCents, parseQuantityToMicro } from '~/lib/money'

export const Route = createFileRoute('/_app/invoices/new')({
  loader: async () => ({
    customers: await listCustomers(),
    services: await listServices(),
  }),
  component: NewInvoicePage,
})

type Line = {
  serviceProductId: string | null
  description: string
  quantity: string
  unitPrice: string
}

function NewInvoicePage() {
  const { customers, services } = Route.useLoaderData()
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [issuedOn, setIssuedOn] = useState(todayISO())
  const [dueOn, setDueOn] = useState(addDaysISO(todayISO(), 14))
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { serviceProductId: null, description: '', quantity: '1', unitPrice: '' },
  ])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const subtotal = useMemo(() => {
    return lines.reduce((s, l) => {
      try {
        const q = parseQuantityToMicro(l.quantity || '0')
        const p = parseDollarsToCents(l.unitPrice || '0')
        // qty × price in cents, divide by 1e6 for micro→whole
        return s + Math.round((q * p) / 1_000_000)
      } catch {
        return s
      }
    }, 0)
  }, [lines])

  if (customers.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-14">
          <h2 className="text-[17px] font-semibold mb-1">Add a customer first</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            You need at least one customer before you can create an invoice.
          </p>
          <Link to="/customers">
            <Button intent="brand">Go to Customers</Button>
          </Link>
        </CardBody>
      </Card>
    )
  }

  function setLine(i: number, patch: Partial<Line>) {
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function pickService(i: number, svcId: string) {
    if (!svcId) {
      setLine(i, { serviceProductId: null })
      return
    }
    const svc = services.find((s) => s.id === svcId)
    if (!svc) return
    setLine(i, {
      serviceProductId: svc.id,
      description: lines[i]!.description || svc.name,
      unitPrice: (svc.rateCents / 100).toFixed(2),
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await createInvoice({
        data: {
          customerId,
          issuedOn,
          dueOn,
          memo: memo || null,
          lines: lines.map((l) => ({
            serviceProductId: l.serviceProductId,
            description: l.description.trim(),
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      })
      navigate({ to: '/invoices/$id', params: { id: result.id } })
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="New invoice"
        subtitle="Record what you're billing. You can log payment against it whenever it arrives."
      />

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Customer" htmlFor="i-cus" required>
                <Select
                  id="i-cus"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Issued on" htmlFor="i-issued" required>
                <Input
                  id="i-issued"
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                  required
                />
              </Field>
              <Field label="Due on" htmlFor="i-due" required>
                <Input
                  id="i-due"
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                  required
                />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold tracking-tight">Line items</h3>
            <Button
              intent="ghost"
              size="sm"
              type="button"
              onClick={() =>
                setLines((rows) => [
                  ...rows,
                  { serviceProductId: null, description: '', quantity: '1', unitPrice: '' },
                ])
              }
            >
              <Icon d="M12 4v16M4 12h16" size={14} /> Add line
            </Button>
          </div>
          <CardBody className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                  <tr className="text-left bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
                    <th className="px-4 py-2 font-medium w-[26%]">Service</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium w-[110px] text-right">Qty</th>
                    <th className="px-4 py-2 font-medium w-[140px] text-right">Rate</th>
                    <th className="px-4 py-2 font-medium w-[140px] text-right">Amount</th>
                    <th className="px-2 py-2 w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    let amount = 0
                    try {
                      const q = parseQuantityToMicro(l.quantity || '0')
                      const p = parseDollarsToCents(l.unitPrice || '0')
                      amount = Math.round((q * p) / 1_000_000)
                    } catch {}
                    return (
                      <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-4 py-2 align-top">
                          <Select
                            value={l.serviceProductId ?? ''}
                            onChange={(e) => pickService(i, e.target.value)}
                          >
                            <option value="">— Custom —</option>
                            {services
                              .filter((s) => s.active)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </Select>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Input
                            value={l.description}
                            onChange={(e) => setLine(i, { description: e.target.value })}
                            placeholder="What you did"
                            required
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Input
                            inputMode="decimal"
                            className="text-right tabular"
                            value={l.quantity}
                            onChange={(e) => setLine(i, { quantity: e.target.value })}
                            required
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Input
                            inputMode="decimal"
                            className="text-right tabular"
                            value={l.unitPrice}
                            onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </td>
                        <td className="px-4 py-2 align-top text-right tabular text-[var(--color-ink)] font-medium">
                          <Money cents={amount} />
                        </td>
                        <td className="px-2 py-2 align-top">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-1"
                              onClick={() => setLines((rows) => rows.filter((_, idx) => idx !== i))}
                              aria-label="Remove line"
                            >
                              <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/40">
                    <td colSpan={4} className="px-4 py-3 text-right text-[var(--color-ink-soft)] uppercase tracking-wider text-[11px] font-medium">
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-right text-[16px] font-semibold tabular">
                      <Money cents={subtotal} />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Field label="Memo" htmlFor="i-memo" hint="Optional. Shown on the invoice record.">
              <Textarea
                id="i-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Project Phase 1, March"
              />
            </Field>
          </CardBody>
        </Card>

        {error && (
          <div className="text-[13px] text-[var(--color-negative)]">{error}</div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link to="/invoices">
            <Button intent="ghost" type="button">Cancel</Button>
          </Link>
          <Button intent="brand" type="submit" disabled={busy || subtotal <= 0}>
            {busy ? 'Creating…' : 'Create invoice'}
          </Button>
        </div>
      </form>
    </>
  )
}
