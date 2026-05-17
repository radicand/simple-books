import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Field,
  Input,
  Textarea,
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
import {
  listServices,
  createService,
  updateService,
  toggleService,
} from '~/server/services.functions'
import type { ServiceProduct } from '~/db/schema'
import { FormGrid } from '~/components/form-grid'

export const Route = createFileRoute('/_app/services')({
  loader: () => listServices(),
  component: ServicesPage,
})

function ServicesPage() {
  const services = Route.useLoaderData() as ServiceProduct[]
  const router = useRouter()
  const [editing, setEditing] = useState<ServiceProduct | null | 'new'>(null)

  async function refresh() {
    await router.invalidate()
  }

  return (
    <>
      <PageHeader
        title="Service products"
        subtitle="The services you sell, with a rate per unit. Use these as line items on invoices."
        actions={
          <Button intent="brand" onClick={() => setEditing('new')}>
            <Icon d="M12 4v16M4 12h16" size={16} /> New service
          </Button>
        }
      />

      <Card>
        {services.length === 0 ? (
          <EmptyState
            title="No services yet"
            hint="Add the kinds of work you sell. For example: Consulting at $150 / hour, or Project deliverable at $2,500 each."
            action={
              <Button intent="brand" onClick={() => setEditing('new')}>
                Add your first service
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Unit</Th>
                <Th className="text-right">Rate</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {services.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="font-medium">{s.name}</div>
                    {s.description && (
                      <div className="text-[12.5px] text-[var(--color-ink-soft)] mt-0.5">
                        {s.description}
                      </div>
                    )}
                  </Td>
                  <Td className="text-[var(--color-ink-soft)]">{s.unit}</Td>
                  <Td className="text-right">
                    <Money cents={s.rateCents} />
                    <span className="text-[var(--color-ink-faint)]"> / {s.unit}</span>
                  </Td>
                  <Td>
                    {s.active ? (
                      <Badge tone="positive">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        intent="ghost"
                        size="sm"
                        onClick={() => setEditing(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        intent="ghost"
                        size="sm"
                        onClick={async () => {
                          await toggleService({ data: { id: s.id, active: !s.active } })
                          refresh()
                        }}
                      >
                        {s.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {editing && (
        <ServiceDialog
          value={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

function ServiceDialog({
  value,
  onClose,
  onSaved,
}: {
  value: ServiceProduct | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [unit, setUnit] = useState(value?.unit ?? 'hour')
  const [rate, setRate] = useState(value ? (value.rateCents / 100).toFixed(2) : '')
  const [description, setDescription] = useState(value?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (value) {
        await updateService({
          data: { id: value.id, name, unit, rate, description, active: value.active },
        })
      } else {
        await createService({ data: { name, unit, rate, description } })
      }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalDialog
      title={value ? 'Edit service' : 'New service'}
      onClose={onClose}
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Name" htmlFor="svc-name" required>
          <Input
            id="svc-name"
            autoFocus
            placeholder="Consulting"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <FormGrid>
          <Field label="Unit" htmlFor="svc-unit" required hint="e.g. hour, session, project">
            <Input
              id="svc-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            />
          </Field>
          <Field label="Rate per unit" htmlFor="svc-rate" required>
            <Input
              id="svc-rate"
              inputMode="decimal"
              placeholder="150.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </Field>
        </FormGrid>
        <Field label="Description" htmlFor="svc-desc" hint="Optional. Shown by default on invoice lines.">
          <Textarea
            id="svc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this covers, scope, deliverables…"
          />
        </Field>
        {error && (
          <div className="text-[13px] text-[var(--color-negative)]">{error}</div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
          <Button intent="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="brand" type="submit" disabled={busy}>
            {busy ? 'Saving…' : value ? 'Save changes' : 'Create service'}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}

export function ModalDialog({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'md' | 'lg'
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-start justify-center p-0 sm:p-4 sm:p-8 bg-[oklch(0.22_0.012_270/0.4)] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`w-full sm:mt-12 max-h-[min(92dvh,100%)] sm:max-h-none flex flex-col overflow-hidden ${size === 'lg' ? 'sm:max-w-[820px]' : 'sm:max-w-[480px]'} bg-[var(--color-surface)] border border-[var(--color-border)] rounded-t-[20px] sm:rounded-[14px] shadow-[var(--shadow-pop)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] p-2 min-h-11 min-w-11 flex items-center justify-center rounded-[8px]"
            aria-label="Close"
          >
            <Icon d="M18 6L6 18M6 6l12 12" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
