import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Money,
  Badge,
  Icon,
} from '~/components/ui'
import { getReceipt, deleteReceipt } from '~/server/receipts.functions'
import { listAttachments } from '~/server/attachments.functions'
import { RecordAttachmentsCard } from '~/components/record-attachments-card'
import { fmtDateLong } from '~/lib/date'

export const Route = createFileRoute('/_app/receipts/$id')({
  loader: async ({ params }) => {
    const [receipt, attachments] = await Promise.all([
      getReceipt({ data: { id: params.id } }),
      listAttachments({ data: { sourceType: 'cash_receipt', sourceId: params.id } }),
    ])
    return { receipt, attachments }
  },
  component: ReceiptDetail,
})

function ReceiptDetail() {
  const { receipt, attachments } = Route.useLoaderData()
  const router = useRouter()

  async function del() {
    if (!confirm('Delete this payment? The invoice will return to Open.')) return
    await deleteReceipt({ data: { id: receipt.id } })
    router.navigate({ to: '/receipts' })
  }

  return (
    <>
      <PageHeader
        title="Payment received"
        subtitle={`${receipt.customerName ?? '—'} · ${fmtDateLong(receipt.receivedOn)}`}
        actions={
          <>
            <Link to="/receipts">
              <Button intent="ghost">
                <Icon d="M15 18l-6-6 6-6" size={16} /> Back
              </Button>
            </Link>
            {receipt.invoiceStatus !== 'void' && (
              <Link to="/receipts/$id/edit" params={{ id: receipt.id }}>
                <Button intent="ghost">Edit</Button>
              </Link>
            )}
            <Button intent="danger" onClick={del}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardBody className="space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                Amount
              </div>
              <Money cents={receipt.amountCents} tone="positive" className="text-[22px] font-semibold" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Method
                </div>
                <Badge tone="neutral">{receipt.method}</Badge>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Invoice
                </div>
                {receipt.invoiceNumber && receipt.invoiceId ? (
                  <Link
                    to="/invoices/$id"
                    params={{ id: receipt.invoiceId }}
                    className="text-[var(--color-brand)] hover:underline font-medium"
                  >
                    {receipt.invoiceNumber}
                  </Link>
                ) : (
                  <span className="text-[var(--color-ink-soft)]">—</span>
                )}
              </div>
            </div>
            {receipt.memo && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Memo
                </div>
                <p className="text-sm text-[var(--color-ink)] whitespace-pre-wrap">{receipt.memo}</p>
              </div>
            )}
          </CardBody>
        </Card>

        <RecordAttachmentsCard
          items={attachments.map((a) => ({ id: a.id, fileName: a.fileName }))}
        />
      </div>
    </>
  )
}
