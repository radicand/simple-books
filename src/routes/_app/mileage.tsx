import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Field,
  Input,
  Table,
  THead,
  Th,
  Tr,
  Td,
  Money,
  EmptyState,
  Icon,
  Badge,
} from '~/components/ui'
import {
  listMileage,
  createMileage,
  deleteMileage,
  getMileageRateCentsPerMile,
} from '~/server/mileage.functions'
import { getMileageRateForDate } from '~/server/settings.functions'
import { formatCentsPerMile } from '~/lib/mileage-rates'
import { microToDecimal, parseQuantityToMicro } from '~/lib/money'
import { fmtDate, todayISO } from '~/lib/date'
import { ModalDialog, useModalClose } from './services'
import { FormGrid } from '~/components/form-grid'
import { PendingFileField } from '~/components/pending-file-field'
import { uploadPendingAttachment } from '~/components/attachment-upload'

export const Route = createFileRoute('/_app/mileage')({
  loader: async () => ({
    entries: await listMileage(),
    defaultRateCents: await getMileageRateCentsPerMile(),
  }),
  component: MileagePage,
})

function MileagePage() {
  const { entries, defaultRateCents } = Route.useLoaderData()
  const router = useRouter()
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        <Card>
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
              <div key={e.id} className="px-4 py-4 flex flex-col gap-2">
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
                    onClick={() => del(e.id)}
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
                <Tr key={e.id}>
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
                      onClick={() => del(e.id)}
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
        onSaved={onSaved}
      />
    </ModalDialog>
  )
}

function MileageTripForm({
  defaultRateCents,
  onSaved,
}: {
  defaultRateCents: number
  onSaved: () => void | Promise<void>
}) {
  const [tripDate, setTripDate] = useState(todayISO())
  const [miles, setMiles] = useState('')
  const [purpose, setPurpose] = useState('')
  const [rateCents, setRateCents] = useState(defaultRateCents)
  const [rateYear, setRateYear] = useState(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const { close, closeNow } = useModalClose()

  async function loadRateForDate(date: string) {
    try {
      const r = await getMileageRateForDate({ data: { tripDate: date } })
      setRateCents(r.centsPerMile)
      setRateYear(r.taxYear)
    } catch {
      /* keep current rate */
    }
  }

  const computed = useMemo(() => {
    try {
      const m = parseQuantityToMicro(miles || '0')
      return Math.round((m * rateCents) / 1_000_000)
    } catch {
      return 0
    }
  }, [miles, rateCents])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await createMileage({
        data: { tripDate, miles, purpose, rateCentsPerMile: rateCents },
      })
      if (pendingFile) {
        await uploadPendingAttachment(pendingFile, 'mileage', result.id)
      }
      await onSaved()
      close()
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <FormGrid>
          <Field label="Trip date" htmlFor="m-date" required>
            <Input
              id="m-date"
              type="date"
              value={tripDate}
              onChange={(e) => {
                setTripDate(e.target.value)
                void loadRateForDate(e.target.value)
              }}
              required
            />
          </Field>
          <Field label="Miles" htmlFor="m-miles" required>
            <Input
              id="m-miles"
              inputMode="decimal"
              className="tabular"
              placeholder="42.3"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              required
              autoFocus
            />
          </Field>
        </FormGrid>
        <Field label="Purpose" htmlFor="m-purpose" required>
          <Input
            id="m-purpose"
            placeholder="Client visit — Acme Co."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </Field>
        <PendingFileField file={pendingFile} onFileChange={setPendingFile} />

        <Field
          label="Rate (¢/mile)"
          htmlFor="m-rate"
          hint={`Rate for ${rateYear}: ${formatCentsPerMile(rateCents)}¢/mile. Override only if needed.`}
        >
          <Input
            id="m-rate"
            type="number"
            min={0}
            max={200}
            className="tabular"
            value={rateCents}
            onChange={(e) => setRateCents(Number(e.target.value || 0))}
          />
        </Field>

        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 flex items-center justify-between">
          <div className="text-[12.5px] text-[var(--color-ink-soft)]">
            Deduction <span className="text-[var(--color-ink-faint)]">(miles × rate)</span>
          </div>
          <div className="text-[17px] font-semibold tabular">
            <Money cents={computed} />
          </div>
        </div>

        {error && <div className="text-[13px] text-[var(--color-negative)]">{error}</div>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
          <Button intent="ghost" type="button" onClick={closeNow}>Cancel</Button>
          <Button intent="brand" type="submit" disabled={busy || computed <= 0}>
            {busy ? 'Saving…' : 'Log trip'}
          </Button>
        </div>
      </form>
  )
}
