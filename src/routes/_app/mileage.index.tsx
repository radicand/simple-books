import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Table,
  THead,
  Th,
  Tr,
  Td,
  Money,
  EmptyState,
  Icon,
} from '~/components/ui'
import {
  listMileage,
  deleteMileage,
  getMileageRateCentsPerMile,
} from '~/server/mileage.functions'
import { formatCentsPerMile } from '~/lib/mileage-rates'
import { microToDecimal } from '~/lib/money'
import { fmtDate } from '~/lib/date'
import { ModalDialog } from './services'
import { MileageTripForm } from '~/components/mileage-trip-form'

export const Route = createFileRoute('/_app/mileage/')({
  loader: async () => ({
    entries: await listMileage(),
    defaultRateCents: await getMileageRateCentsPerMile(),
  }),
  component: MileagePage,
})

function MileagePage() {
  const { entries, defaultRateCents } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function del(id: string) {
    if (!confirm('Delete this mileage entry?')) return
    await deleteMileage({ data: { id } })
    router.invalidate()
  }

  const totalMiles = entries.reduce((s, e) => s + e.milesMicro, 0)
  const totalAmount = entries.reduce((s, e) => s + e.amountCents, 0)

  return (
    <>
      <PageHeader
        title="Mileage"
        subtitle={
          <span>
            Current-year rate{' '}
            <span className="font-medium text-[var(--color-ink)]">
              {formatCentsPerMile(defaultRateCents)}¢/mile
            </span>
            . Manage rates in{' '}
            <a href="/settings" className="text-[var(--color-brand)] hover:underline">
              Settings
            </a>
            .
            Each entry credits Owner's Contribution and debits Vehicle Expense.
          </span>
        }
        actions={
          <Button intent="brand" onClick={() => setOpen(true)}>
            <Icon d="M12 4v16M4 12h16" size={16} /> Add trip
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardBody className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
              Total trips
            </div>
            <div className="mt-2 text-[22px] font-semibold tabular">{entries.length}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
              Total miles
            </div>
            <div className="mt-2 text-[22px] font-semibold tabular">
              {microToDecimal(totalMiles, 1)}
            </div>
          </CardBody>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardBody className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
              Total deduction
            </div>
            <div className="mt-2 text-[22px] font-semibold tabular">
              <Money cents={totalAmount} />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            title="No trips logged"
            hint="Track business driving here. Enter miles and purpose; we compute the deduction using the IRS standard rate."
            action={<Button intent="brand" onClick={() => setOpen(true)}>Log your first trip</Button>}
          />
        ) : (
          <>
          <div className="sm:hidden divide-y divide-[var(--color-border)]">
            {entries.map((e) => (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                className="px-4 py-4 flex flex-col gap-2 cursor-pointer hover:bg-[var(--color-surface-2)]"
                onClick={() => navigate({ to: '/mileage/$id', params: { id: e.id } })}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    navigate({ to: '/mileage/$id', params: { id: e.id } })
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{e.purpose}</div>
                    <div className="text-[13px] text-[var(--color-ink-soft)] mt-0.5">
                      {fmtDate(e.tripDate)} · {microToDecimal(e.milesMicro, 1)} mi
                    </div>
                  </div>
                  <Money cents={e.amountCents} className="text-[16px] font-semibold shrink-0" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--color-ink-faint)] tabular">
                    ${(e.rateMicroPerMile / 1_000_000).toFixed(2)}/mi
                  </span>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation()
                      void del(e.id)
                    }}
                    className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-2 min-h-11 min-w-11 flex items-center justify-center"
                    aria-label="Delete trip"
                  >
                    <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block">
          <Table>
            <THead>
              <tr>
                <Th>Date</Th>
                <Th>Purpose</Th>
                <Th className="text-right">Miles</Th>
                <Th className="text-right">Rate</Th>
                <Th className="text-right">Deduction</Th>
                <Th></Th>
              </tr>
            </THead>
            <tbody>
              {entries.map((e) => (
                <Tr
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => navigate({ to: '/mileage/$id', params: { id: e.id } })}
                >
                  <Td className="text-[var(--color-ink-soft)]">{fmtDate(e.tripDate)}</Td>
                  <Td>{e.purpose}</Td>
                  <Td className="text-right tabular">{microToDecimal(e.milesMicro, 1)}</Td>
                  <Td className="text-right tabular text-[var(--color-ink-soft)]">
                    ${(e.rateMicroPerMile / 1_000_000).toFixed(2)}/mi
                  </Td>
                  <Td className="text-right">
                    <Money cents={e.amountCents} />
                  </Td>
                  <Td className="text-right">
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation()
                        void del(e.id)
                      }}
                      className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-1"
                      aria-label="Delete trip"
                    >
                      <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          </div>
          </>
        )}
      </Card>

      {open && (
        <MileageDialog
          defaultRateCents={defaultRateCents}
          onClose={() => setOpen(false)}
          onSaved={() => router.invalidate()}
        />
      )}
    </>
  )
}


function MileageDialog({
  defaultRateCents,
  onClose,
  onSaved,
}: {
  defaultRateCents: number
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  return (
    <ModalDialog title="Log a trip" onClose={onClose} deferCloseMs={300}>
      <MileageTripForm
        defaultRateCents={defaultRateCents}
        onSaved={async () => {
          await onSaved()
          onClose()
        }}
        onCancel={onClose}
      />
    </ModalDialog>
  )
}
