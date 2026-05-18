import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import { listInvoices } from '~/server/invoices.functions'
import { fmtDate } from '~/lib/date'

export const Route = createFileRoute('/_app/invoices/')({
  loader: () => listInvoices(),
  component: InvoicesPage,
})

function InvoicesPage() {
  const invoices = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Every invoice you've issued. Click a row to view detail or record a payment."
        actions={
          <Link to="/invoices/new">
            <Button intent="brand">
              <Icon d="M12 4v16M4 12h16" size={16} /> New invoice
            </Button>
          </Link>
        }
      />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            hint="Create your first invoice. Or, if a customer pays before you bill them, just log the payment — we'll auto-create one."
            action={
              <Link to="/invoices/new">
                <Button intent="brand">Create your first invoice</Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Number</Th>
                <Th>Customer</Th>
                <Th>Issued</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Balance</Th>
              </tr>
            </THead>
            <tbody>
              {invoices.map((i: any) => (
                <Tr
                  key={i.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/invoices/$id', params: { id: i.id } })}
                >
                  <Td className="font-medium">
                    <Link to="/invoices/$id" params={{ id: i.id }} className="hover:underline">
                      {i.number}
                    </Link>
                    {i.autoCreated && (
                      <Badge tone="info" className="ml-2">auto</Badge>
                    )}
                  </Td>
                  <Td>{i.customerName ?? '—'}</Td>
                  <Td className="text-[var(--color-ink-soft)]">{fmtDate(i.issuedOn)}</Td>
                  <Td className="text-[var(--color-ink-soft)]">{fmtDate(i.dueOn)}</Td>
                  <Td>
                    {i.status === 'paid' ? (
                      <Badge tone="positive">Paid</Badge>
                    ) : i.status === 'void' ? (
                      <Badge tone="neutral">Void</Badge>
                    ) : (
                      <Badge tone="warning">Open</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Money cents={i.subtotalCents} />
                  </Td>
                  <Td className="text-right">
                    <Money cents={i.balanceCents} tone={i.balanceCents > 0 ? 'negative' : 'muted'} />
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
