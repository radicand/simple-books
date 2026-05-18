import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Money,
  Badge,
  Icon,
  Table,
  THead,
  Th,
  Tr,
  Td,
} from '~/components/ui'
import { getInvoice, voidInvoice } from '~/server/invoices.functions'
import { listAttachments } from '~/server/attachments.functions'
import { RecordAttachmentsCard } from '~/components/record-attachments-card'
import { fmtDateLong, fmtDate } from '~/lib/date'
import { microToDecimal } from '~/lib/money'

export const Route = createFileRoute('/_app/invoices/$id')({
  loader: async ({ params }) => {
    const [inv, attachments] = await Promise.all([
      getInvoice({ data: { id: params.id } }),
      listAttachments({ data: { sourceType: 'invoice', sourceId: params.id } }),
    ])
    return { ...inv, attachments }
  },
  component: InvoiceDetail,
})

function InvoiceDetail() {
  const inv = Route.useLoaderData()
  const router = useRouter()

  async function doVoid() {
    if (!confirm(`Void invoice ${inv.number}? This cannot be undone.`)) return
    try {
      await voidInvoice({ data: { id: inv.id } })
      router.invalidate()
    } catch (e: any) {
      alert(e?.message ?? String(e))
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span>Invoice {inv.number}</span>
            {inv.status === 'paid' ? (
              <Badge tone="positive">Paid</Badge>
            ) : inv.status === 'void' ? (
              <Badge tone="neutral">Void</Badge>
            ) : (
              <Badge tone="warning">Open</Badge>
            )}
            {inv.autoCreated && <Badge tone="info">Auto-created</Badge>}
          </span>
        }
        subtitle={`${inv.customerName ?? '—'} · issued ${fmtDateLong(inv.issuedOn)}`}
        actions={
          <>
            <Link to="/invoices">
              <Button intent="ghost">
                <Icon d="M15 18l-6-6 6-6" size={16} /> Back
              </Button>
            </Link>
            {inv.status === 'open' && inv.balanceCents > 0 && (
              <Link
                to="/receipts/new"
                search={{ invoiceId: inv.id }}
              >
                <Button intent="brand">
                  <Icon d="M12 4v16M4 12h16" size={16} /> Log payment
                </Button>
              </Link>
            )}
            {inv.status === 'open' && inv.receipts.length === 0 && (
              <Link to="/invoices/$id/edit" params={{ id: inv.id }}>
                <Button intent="ghost">Edit</Button>
              </Link>
            )}
            {inv.status !== 'void' && inv.receipts.length === 0 && (
              <Button intent="danger" onClick={doVoid}>
                Void
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">Lines</h3>
              <div className="text-[12px] text-[var(--color-ink-faint)]">
                Due {fmtDate(inv.dueOn)}
              </div>
            </div>
            <CardBody className="!p-0">
              <div className="md:hidden divide-y divide-[var(--color-border)]">
                {inv.lines.map((l) => (
                  <div key={l.id} className="px-4 py-4 space-y-1">
                    <div className="font-medium">{l.description}</div>
                    <div className="flex items-center justify-between text-[13px] text-[var(--color-ink-soft)]">
                      <span className="tabular">
                        {microToDecimal(l.quantityMicro, 2)} × <Money cents={l.unitPriceCents} />
                      </span>
                      <Money cents={l.amountCents} className="font-semibold text-[var(--color-ink)]" />
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 space-y-2 bg-[var(--color-surface-2)]/50 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Subtotal</span>
                    <Money cents={inv.subtotalCents} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-soft)]">Paid</span>
                    <span className="text-[var(--color-positive)] tabular">
                      −<Money cents={inv.paidCents} />
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-[var(--color-border)]">
                    <span>Balance</span>
                    <Money cents={inv.balanceCents} tone={inv.balanceCents > 0 ? 'negative' : 'muted'} />
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>Description</Th>
                    <Th className="text-right">Qty</Th>
                    <Th className="text-right">Rate</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </THead>
                <tbody>
                  {inv.lines.map((l) => (
                    <Tr key={l.id}>
                      <Td>{l.description}</Td>
                      <Td className="text-right tabular text-[var(--color-ink-soft)]">
                        {microToDecimal(l.quantityMicro, 2)}
                      </Td>
                      <Td className="text-right tabular text-[var(--color-ink-soft)]">
                        <Money cents={l.unitPriceCents} />
                      </Td>
                      <Td className="text-right tabular">
                        <Money cents={l.amountCents} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)]">
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-[11px] text-[var(--color-ink-faint)] font-medium">
                      Subtotal
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">
                      <Money cents={inv.subtotalCents} />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right uppercase tracking-wider text-[11px] text-[var(--color-ink-faint)] font-medium">
                      Paid
                    </td>
                    <td className="px-4 py-2 text-right tabular text-[var(--color-positive)]">
                      −<Money cents={inv.paidCents} />
                    </td>
                  </tr>
                  <tr className="bg-[var(--color-surface-2)]">
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-[12px] text-[var(--color-ink-soft)] font-semibold">
                      Balance
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[16px] tabular">
                      <Money cents={inv.balanceCents} tone={inv.balanceCents > 0 ? 'negative' : 'muted'} />
                    </td>
                  </tr>
                </tfoot>
              </Table>
              </div>
            </CardBody>
          </Card>

          {inv.memo && (
            <Card>
              <CardBody>
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] mb-1.5 font-medium">
                  Memo
                </div>
                <div className="text-sm text-[var(--color-ink)] whitespace-pre-wrap">{inv.memo}</div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h3 className="text-[14px] font-semibold">Payments</h3>
            </div>
            <CardBody className="!p-0">
              {inv.receipts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[var(--color-ink-soft)]">
                  No payments recorded.
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {inv.receipts.map((r) => (
                    <li key={r.id} className="px-5 py-3 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium tabular">
                          <Money cents={r.amountCents} tone="positive" />
                        </div>
                        <div className="text-[12px] text-[var(--color-ink-faint)]">
                          {fmtDate(r.receivedOn)} · {r.method}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <RecordAttachmentsCard
            items={inv.attachments.map((a) => ({ id: a.id, fileName: a.fileName }))}
          />
        </div>
      </div>
    </>
  )
}
