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
} from '~/components/ui'
import { FormGrid } from '~/components/form-grid'
import { FormActions } from '~/components/form-actions'
import {
  createInvoiceLineDraft,
  InvoiceLineEditor,
  type InvoiceLineDraft,
} from '~/components/invoice-line-editor'
import { listCustomers } from '~/server/customers.functions'
import { listServices } from '~/server/services.functions'
import { createInvoice } from '~/server/invoices.functions'
import { todayISO, addDaysISO } from '~/lib/date'
import { parseDollarsToCents, parseQuantityToMicro } from '~/lib/money'
import { PendingFileField } from '~/components/pending-file-field'
import { uploadPendingAttachment } from '~/components/attachment-upload'

export const Route = createFileRoute('/_app/invoices/new')({
  loader: async () => ({
    customers: await listCustomers(),
    services: await listServices(),
  }),
  component: NewInvoicePage,
})

function NewInvoicePage() {
  const { customers, services } = Route.useLoaderData()
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [issuedOn, setIssuedOn] = useState(todayISO())
  const [dueOn, setDueOn] = useState(addDaysISO(todayISO(), 14))
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState<InvoiceLineDraft[]>([
    createInvoiceLineDraft(),
  ])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

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

  function setLine(i: number, patch: Partial<InvoiceLineDraft>) {
    setLines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
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
      if (pendingFile) {
        await uploadPendingAttachment(pendingFile, 'invoice', result.id)
      }
      navigate({ to: '/invoices/$id', params: { id: result.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
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
            <FormGrid cols={3}>
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
                createInvoiceLineDraft(),
              ])
            }
            onRemove={(i) => setLines((rows) => rows.filter((_, idx) => idx !== i))}
          />
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
            <div className="mt-4">
              <PendingFileField file={pendingFile} onFileChange={setPendingFile} />
            </div>
          </CardBody>
        </Card>

        {error && (
          <div className="text-[13px] text-[var(--color-negative)]">{error}</div>
        )}

        <FormActions>
          <Link to="/invoices">
            <Button intent="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button intent="brand" type="submit" disabled={busy || subtotal <= 0}>
            {busy ? 'Creating…' : 'Create invoice'}
          </Button>
        </FormActions>
      </form>
    </>
  )
}
