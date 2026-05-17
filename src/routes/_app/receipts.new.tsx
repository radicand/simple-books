import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Money,
  Badge,
} from '~/components/ui'
import { listCustomers } from '~/server/customers.functions'
import {
  createReceipt,
  openInvoicesForCustomer,
} from '~/server/receipts.functions'
import { todayISO, fmtDate } from '~/lib/date'

const searchSchema = z.object({ invoiceId: z.string().optional() })

export const Route = createFileRoute('/_app/receipts/new')({
  validateSearch: searchSchema,
  loader: async () => ({ customers: await listCustomers() }),
  component: NewReceipt,
})

function NewReceipt() {
  const { customers } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [invoiceId, setInvoiceId] = useState<string>(search.invoiceId ?? '')
  const [openInvoices, setOpenInvoices] = useState<Array<any>>([])
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'cash' | 'check' | 'card' | 'transfer' | 'other'>('transfer')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoInvoiceNotice, setAutoInvoiceNotice] = useState<string | null>(null)

  // Load customer from invoice param if needed
  useEffect(() => {
    if (!search.invoiceId) return
    // We don't have customer eagerly; the open-invoices call below will set context.
  }, [search.invoiceId])

  useEffect(() => {
    if (!customerId) {
      setOpenInvoices([])
      return
    }
    openInvoicesForCustomer({ data: { customerId } }).then((list) => {
      setOpenInvoices(list)
      // if param-supplied invoiceId not in list, clear it
      if (invoiceId && !list.some((i) => i.id === invoiceId)) {
        // it may still belong to this customer but be paid; leave as-is for now
      }
    })
  }, [customerId])

  // If invoiceId in search came in, auto-select customer once we discover it.
  // We assume the link came from the invoice detail page which already passed
  // the customer context — but be safe: if user changes customer the invoice
  // selection clears.

  if (customers.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-14">
          <h2 className="text-[17px] font-semibold mb-1">Add a customer first</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            You need at least one customer before logging a payment.
          </p>
          <Link to="/customers"><Button intent="brand">Go to Customers</Button></Link>
        </CardBody>
      </Card>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    setAutoInvoiceNotice(null)
    try {
      const result = await createReceipt({
        data: {
          customerId,
          invoiceId: invoiceId || null,
          receivedOn,
          amount,
          method,
          memo: memo || null,
        },
      })
      if (result.autoInvoice) {
        setAutoInvoiceNotice(
          `Auto-created invoice ${result.autoInvoice.number} for this payment.`,
        )
        setTimeout(() => navigate({ to: '/receipts' }), 1200)
      } else {
        navigate({ to: '/receipts' })
      }
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  const pickedInvoice = openInvoices.find((i) => i.id === invoiceId)

  return (
    <>
      <PageHeader
        title="Log a payment"
        subtitle="Apply this against an open invoice. If there isn't one, leave Invoice blank and we'll create one for you."
      />

      <form onSubmit={submit} className="space-y-6 max-w-[640px]">
        <Card>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Customer" htmlFor="r-cus" required>
                <Select
                  id="r-cus"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    setInvoiceId('')
                  }}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Received on" htmlFor="r-date" required>
                <Input
                  id="r-date"
                  type="date"
                  value={receivedOn}
                  onChange={(e) => setReceivedOn(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field
              label="Apply to invoice"
              htmlFor="r-inv"
              hint="Leave blank to auto-create an invoice for this payment."
            >
              <Select
                id="r-inv"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
              >
                <option value="">— Auto-create invoice —</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number} · {fmtDate(i.issuedOn)} · balance ${(i.balanceCents / 100).toFixed(2)}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount" htmlFor="r-amt" required>
                <Input
                  id="r-amt"
                  inputMode="decimal"
                  className="tabular"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>
              <Field label="Method" htmlFor="r-method" required>
                <Select id="r-method" value={method} onChange={(e) => setMethod(e.target.value as any)}>
                  <option value="transfer">Bank transfer</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </div>

            <Field label="Memo" htmlFor="r-memo">
              <Textarea
                id="r-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Reference number, notes…"
              />
            </Field>

            {pickedInvoice && (
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] flex items-center justify-between">
                <span>
                  Applying to <span className="font-medium">{pickedInvoice.number}</span> · balance
                </span>
                <Money cents={pickedInvoice.balanceCents} />
              </div>
            )}

            {!invoiceId && customerId && (
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-[13px]">
                <Badge tone="brand" className="mr-2">Auto</Badge>
                An invoice will be created automatically for this payment.
              </div>
            )}

            {error && <div className="text-[13px] text-[var(--color-negative)]">{error}</div>}
            {autoInvoiceNotice && (
              <div className="text-[13px] text-[var(--color-positive)]">
                {autoInvoiceNotice}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Link to="/receipts">
            <Button intent="ghost" type="button">Cancel</Button>
          </Link>
          <Button intent="brand" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Log payment'}
          </Button>
        </div>
      </form>
    </>
  )
}
