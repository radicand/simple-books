import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
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
  getReceipt,
  updateReceipt,
  openInvoicesForCustomer,
} from '~/server/receipts.functions'
import { listAttachments } from '~/server/attachments.functions'
import { EditableAttachmentsCard } from '~/components/editable-attachments-card'
import { fmtDate } from '~/lib/date'
import { FormGrid } from '~/components/form-grid'
import { FormActions } from '~/components/form-actions'

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export const Route = createFileRoute('/_app/receipts/$id_/edit')({
  loader: async ({ params }) => {
    const [receipt, customers, attachments] = await Promise.all([
      getReceipt({ data: { id: params.id } }),
      listCustomers(),
      listAttachments({ data: { sourceType: 'cash_receipt', sourceId: params.id } }),
    ])
    return { receipt, customers, attachments }
  },
  component: EditReceipt,
})

function EditReceipt() {
  const { receipt, customers, attachments } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [customerId, setCustomerId] = useState(receipt.customerId)
  const [invoiceId, setInvoiceId] = useState(receipt.invoiceId)
  const [openInvoices, setOpenInvoices] = useState<Array<{
    id: string
    number: string
    issuedOn: string
    balanceCents: number
  }>>([])
  const [receivedOn, setReceivedOn] = useState(receipt.receivedOn)
  const [amount, setAmount] = useState(centsToInput(receipt.amountCents))
  const [method, setMethod] = useState(receipt.method)
  const [memo, setMemo] = useState(receipt.memo ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const invoiceLocked = receipt.invoiceAutoCreated === true

  useEffect(() => {
    if (!customerId) {
      setOpenInvoices([])
      return
    }
    openInvoicesForCustomer({
      data: { customerId, includeInvoiceId: receipt.invoiceId },
    }).then(setOpenInvoices)
  }, [customerId, receipt.invoiceId])

  if (receipt.invoiceStatus === 'void') {
    return (
      <Card>
        <CardBody className="text-center py-14">
          <h2 className="text-[17px] font-semibold mb-1">This payment cannot be edited</h2>
          <p className="text-sm text-[var(--color-ink-soft)] mb-5">
            The linked invoice is void.
          </p>
          <Link to="/receipts/$id" params={{ id: receipt.id }}>
            <Button intent="brand">Back to payment</Button>
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await updateReceipt({
        data: {
          id: receipt.id,
          customerId,
          invoiceId: invoiceId || receipt.invoiceId,
          receivedOn,
          amount,
          method,
          memo: memo || null,
        },
      })
      navigate({ to: '/receipts/$id', params: { id: receipt.id } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const pickedInvoice = openInvoices.find((i) => i.id === invoiceId)

  return (
    <>
      <PageHeader
        title="Edit payment"
        subtitle={
          invoiceLocked
            ? 'Amount and date update the auto-created invoice too.'
            : 'Update payment details or apply to a different open invoice.'
        }
      />

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardBody className="space-y-4">
            <FormGrid>
              <Field label="Customer" htmlFor="r-cus" required>
                <Select
                  id="r-cus"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value)
                    if (!invoiceLocked) setInvoiceId('')
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
            </FormGrid>

            <Field
              label="Apply to invoice"
              htmlFor="r-inv"
              hint={
                invoiceLocked
                  ? 'This payment is tied to an auto-created invoice and cannot be reassigned.'
                  : 'Choose an open invoice for this customer.'
              }
            >
              <Select
                id="r-inv"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                disabled={invoiceLocked}
              >
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.number} · {fmtDate(i.issuedOn)} · balance ${(i.balanceCents / 100).toFixed(2)}
                  </option>
                ))}
              </Select>
            </Field>

            {invoiceLocked && (
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-brand-soft)] px-3 py-2 text-[13px]">
                <Badge tone="brand" className="mr-2">
                  Auto
                </Badge>
                Editing amount or date updates invoice {receipt.invoiceNumber}.
              </div>
            )}

            <FormGrid>
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
                <Select
                  id="r-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                >
                  <option value="transfer">Bank transfer</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </FormGrid>

            <Field label="Memo" htmlFor="r-memo">
              <Textarea
                id="r-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Reference number, notes…"
              />
            </Field>

            {pickedInvoice && !invoiceLocked && (
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] flex items-center justify-between">
                <span>
                  Applying to <span className="font-medium">{pickedInvoice.number}</span> · balance
                </span>
                <Money cents={pickedInvoice.balanceCents} />
              </div>
            )}

            {error && (
              <div className="text-[13px] text-[var(--color-negative)]">{error}</div>
            )}
          </CardBody>
        </Card>

        <EditableAttachmentsCard
          items={attachments.map((a) => ({ id: a.id, fileName: a.fileName }))}
          sourceType="cash_receipt"
          sourceId={receipt.id}
          onChanged={() => router.invalidate()}
        />

        <FormActions>
          <Link to="/receipts/$id" params={{ id: receipt.id }}>
            <Button intent="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button intent="brand" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </FormActions>
      </form>
    </>
  )
}
