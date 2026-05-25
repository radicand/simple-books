import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  PageHeader,
  Card,
  Button,
  Field,
  Input,
  Textarea,
  Table,
  THead,
  Th,
  Tr,
  Td,
  EmptyState,
  Icon,
} from '~/components/ui'
import {
  listCustomers,
  createCustomer,
  updateCustomer,
} from '~/server/customers.functions'
import { ModalDialog } from './services'
import type { Customer } from '~/db/schema'

export const Route = createFileRoute('/_app/customers')({
  loader: () => listCustomers(),
  component: CustomersPage,
})

function CustomersPage() {
  const customers = Route.useLoaderData() as Customer[]
  const router = useRouter()
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="People and companies you bill. Keep it simple — add more info as you go."
        actions={
          <Button intent="brand" onClick={() => setEditing('new')}>
            <Icon d="M12 4v16M4 12h16" size={16} /> Add customer
          </Button>
        }
      />

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title="No customers yet"
            hint="Add a customer to start invoicing. Just a name is enough to begin."
            action={
              <Button intent="brand" onClick={() => setEditing('new')}>
                Add your first customer
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Notes</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {customers.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td className="text-[var(--color-ink-soft)]">{c.email || '—'}</Td>
                  <Td className="text-[var(--color-ink-soft)] truncate max-w-[360px]">
                    {c.notes || '—'}
                  </Td>
                  <Td className="text-right">
                    <Button
                      intent="ghost"
                      size="sm"
                      onClick={() => setEditing(c)}
                    >
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {editing && (
        <CustomerDialog
          value={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await router.invalidate()
            setTimeout(() => setEditing(null), 0)
          }}
        />
      )}
    </>
  )
}

function CustomerDialog({
  value,
  onClose,
  onSaved,
}: {
  value: Customer | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [email, setEmail] = useState(value?.email ?? '')
  const [notes, setNotes] = useState(value?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (value) {
        await updateCustomer({ data: { id: value.id, name, email, notes } })
      } else {
        await createCustomer({ data: { name, email, notes } })
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalDialog
      title={value ? 'Edit customer' : 'New customer'}
      onClose={onClose}
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="cus-name" required>
          <Input
            id="cus-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Co."
            required
          />
        </Field>
        <Field label="Email" htmlFor="cus-email" hint="Optional — for your records only.">
          <Input
            id="cus-email"
            type="email"
            value={email ?? ''}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ap@acme.com"
          />
        </Field>
        <Field label="Notes" htmlFor="cus-notes">
          <Textarea
            id="cus-notes"
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering…"
          />
        </Field>
        {error && <div className="text-[13px] text-[var(--color-negative)]">{error}</div>}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
          <Button intent="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="brand" type="submit" disabled={busy}>
            {busy ? 'Saving…' : value ? 'Save changes' : 'Add customer'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
