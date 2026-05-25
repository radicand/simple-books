import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  PageHeader,
  Card,
  Button,
  Table,
  THead,
  Th,
  Tr,
  Td,
  Money,
  Badge,
  EmptyState,
  Icon,
} from '~/components/ui'
import { listReceipts, deleteReceipt } from '~/server/receipts.functions'
import { fmtDate } from '~/lib/date'

export const Route = createFileRoute('/_app/receipts/')({
  loader: () => listReceipts(),
  component: ReceiptsPage,
})

function ReceiptsPage() {
  const receipts = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  async function del(id: string) {
    if (!confirm('Delete this payment? The invoice will return to Open.')) return
    await deleteReceipt({ data: { id } })
    router.invalidate()
  }

  return (
    <>
      <PageHeader
        title="Cash receipts"
        subtitle="Money you've actually received. Each one updates your cash balance and settles an invoice."
        actions={
          <Link to="/receipts/new">
            <Button intent="brand">
              <Icon d="M12 4v16M4 12h16" size={16} /> Log payment
            </Button>
          </Link>
        }
      />

      <Card>
        {receipts.length === 0 ? (
          <EmptyState
            title="No payments logged"
            hint="When a customer pays, log it here. If there's no matching invoice yet, we'll auto-create one for you."
            action={
              <Link to="/receipts/new">
                <Button intent="brand">Log your first payment</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Received on</Th>
                <Th>Customer</Th>
                <Th>Invoice</Th>
                <Th>Method</Th>
                <Th className="text-right">Amount</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {receipts.map((r) => (
                <Tr
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/receipts/$id', params: { id: r.id } })}
                >
                  <Td className="text-[var(--color-ink-soft)]">{fmtDate(r.receivedOn)}</Td>
                  <Td>{r.customerName ?? '—'}</Td>
                  <Td>
                    {r.invoiceNumber ? (
                      <Link to="/invoices/$id" params={{ id: r.invoiceId }} className="hover:underline">
                        {r.invoiceNumber}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <Badge tone="neutral">{r.method}</Badge>
                  </Td>
                  <Td className="text-right">
                    <Money cents={r.amountCents} tone="positive" />
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        void del(r.id)
                      }}
                      className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-1"
                      aria-label="Delete payment"
                    >
                      <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
