import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
} from '~/components/ui'
import { FormGrid } from '~/components/form-grid'
import { FormActions } from '~/components/form-actions'
import {
  InvoiceLineEditor,
  type InvoiceLineDraft,
} from '~/components/invoice-line-editor'
import { listCustomers } from '~/server/customers.functions'
import { listServices } from '~/server/services.functions'
import { getInvoice, updateInvoice } from '~/server/invoices.functions'
import {
  parseDollarsToCents,
  parseQuantityToMicro,
  microToDecimal,
  fmtCents,
} from '~/lib/money'

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export const Route = createFileRoute('/_app/invoices/$id_/edit')({
  loader: async ({ params }) => {
    const [inv, customers, services] = await Promise.all([
      getInvoice({ data: { id: params.id } }),
      listCustomers(),
      listServices(),
    ])
    return { inv, customers, services }
  },
  component: EditInvoicePage,
})

function EditInvoicePage() {
  const { inv, customers, services } = Route.useLoaderData()
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(inv.customerId)
  const [issuedOn, setIssuedOn] = useState(inv.issuedOn)
  const [dueOn, setDueOn] = useState(inv.dueOn)
  const [memo, setMemo] = useState(inv.memo ?? '')
  const [lines, setLines] = useState<InvoiceLineDraft[]>(() =>
    inv.lines.map((l) => ({
      serviceProductId: l.serviceProductId,
      description: l.description,
      quantity: microToDecimal(l.quantityMicro, 6),
      unitPrice: centsToInput(l.unitPriceCents),
    })),
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const tiedToPayment = inv.autoCreated && inv.paidCents > 0
  const [invoiceTotal, setInvoiceTotal] = useState(() =>
    tiedToPayment ? centsToInput(inv.paidCents) : '',
  )

  const subtotal = useMemo(() => {
    return lines.reduce((s, l) => {
      try {
        const q = parseQuantityToMicro(l.quantity || '0')
        const p = parseDollarsToCents(l.unitPrice || '0')
        return s + Math.round((q * p) / 1_000_000)
      } catch {
        return s
      }
    }, 0)
  }, [lines])

  const effectiveSubtotal = useMemo(() => {
    if (!tiedToPayment) return subtotal
    try {
      return parseDollarsToCents(invoiceTotal || '0')
    } catch {
      return 0
    }
  }, [tiedToPayment, subtotal, invoiceTotal])

  const canEdit =
    inv.status !== 'void' &&
    ((inv.status === 'open' && inv.receipts.length === 0) || tiedToPayment)

  if (!canEdit) {
    return (
      <Card>
        <CardBody className="text-center py-14">
          <h2 className="text-[17px] font-semibold mb-1">This invoice cannot be edited</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            {inv.status === 'void'
              ? 'Void invoices cannot be changed.'
              : 'Delete payments first, or only open invoices with no payments can be edited.'}
          </p>
          <Link to="/invoices/$id" params={{ id: inv.id }}>
            <Button intent="brand">Back to invoice</Button>
          </Link>
        </CardBody>
      </Card>
    )
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-14">
          <h2 className="text-[17px] font-semibold mb-1">Add a customer first</h2>
          <Link to="/customers">
            <Button intent="brand">Go to Customers</Button>
          </Link>
        </CardBody>
      </Card>
    )
  }

  function setLine(i: number, patch: Partial<InvoiceLineDraft>) {
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await updateInvoice({
        data: {
          id: inv.id,
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
          ...(tiedToPayment ? { subtotalOverride: invoiceTotal } : {}),
        },
      })
      navigate({ to: '/invoices/$id', params: { id: inv.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={`Edit invoice ${inv.number}`}
        subtitle={
          tiedToPayment
            ? `Classify this payment (${fmtCents(inv.paidCents)}). The invoice total must stay ${fmtCents(inv.paidCents)}.`
            : 'Update line items and dates. The invoice number stays the same.'
        }
      />

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardBody>
            <FormGrid cols={3}>
              <Field
                label="Customer"
                htmlFor="i-cus"
                required
                hint={tiedToPayment ? 'Locked for auto-created invoices.' : undefined}
              >
                <Select
                  id="i-cus"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                  disabled={tiedToPayment}
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
            </FormGrid>
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <InvoiceLineEditor
            lines={lines}
            services={services}
            subtotalCents={subtotal}
            onChange={setLine}
            onAdd={() =>
              setLines((rows) => [
                ...rows,
                { serviceProductId: null, description: '', quantity: '1', unitPrice: '' },
              ])
            }
            onRemove={(i) => setLines((rows) => rows.filter((_, idx) => idx !== i))}
          />
        </Card>

        {tiedToPayment && (
          <Card>
            <CardBody>
              <Field
                label="Invoice total"
                htmlFor="i-total"
                required
                hint={`Must match the payment (${fmtCents(inv.paidCents)}). Use this when line items do not add up exactly.`}
              >
                <Input
                  id="i-total"
                  inputMode="decimal"
                  value={invoiceTotal}
                  onChange={(e) => setInvoiceTotal(e.target.value)}
                  required
                />
              </Field>
              {subtotal > 0 && subtotal !== effectiveSubtotal && (
                <p className="mt-2 text-[12px] text-[var(--color-ink-faint)]">
                  Line items sum to {fmtCents(subtotal)}; invoice total uses the override above.
                </p>
              )}
            </CardBody>
          </Card>
        )}

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

        <FormActions>
          <Link to="/invoices/$id" params={{ id: inv.id }}>
            <Button intent="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            intent="brand"
            type="submit"
            disabled={busy || effectiveSubtotal <= 0 || (tiedToPayment && effectiveSubtotal !== inv.paidCents)}
          >
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </FormActions>
      </form>
    </>
  )
}
