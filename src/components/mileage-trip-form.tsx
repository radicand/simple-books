import { useEffect, useMemo, useState } from 'react'
import { Button, Field, Input, Money } from '~/components/ui'
import { FormGrid } from '~/components/form-grid'
import { PendingFileField } from '~/components/pending-file-field'
import { uploadPendingAttachment } from '~/components/attachment-upload'
import { formatCentsPerMile } from '~/lib/mileage-rates'
import { microToDecimal, parseQuantityToMicro } from '~/lib/money'
import { todayISO } from '~/lib/date'
import { createMileage, updateMileage } from '~/server/mileage.functions'
import { getMileageRateForDate } from '~/server/settings.functions'

export type MileageEditInitial = {
  id: string
  tripDate: string
  milesMicro: number
  purpose: string
}

export function MileageTripForm({
  defaultRateCents,
  initial,
  onSaved,
  onCancel,
}: {
  defaultRateCents: number
  initial?: MileageEditInitial
  onSaved: () => void | Promise<void>
  onCancel: () => void
}) {
  const isEdit = Boolean(initial)
  const [tripDate, setTripDate] = useState(initial?.tripDate ?? todayISO())
  const [miles, setMiles] = useState(
    initial ? microToDecimal(initial.milesMicro, 6) : '',
  )
  const [purpose, setPurpose] = useState(initial?.purpose ?? '')
  const [rateCents, setRateCents] = useState(defaultRateCents)
  const [rateYear, setRateYear] = useState(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  async function loadRateForDate(date: string) {
    try {
      const r = await getMileageRateForDate({ data: { tripDate: date } })
      setRateCents(r.centsPerMile)
      setRateYear(r.taxYear)
    } catch {
      /* keep current rate */
    }
  }

  useEffect(() => {
    if (initial?.tripDate) void loadRateForDate(initial.tripDate)
  }, [initial?.tripDate])

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
      if (isEdit && initial) {
        await updateMileage({
          data: { id: initial.id, tripDate, miles, purpose },
        })
      } else {
        const result = await createMileage({
          data: { tripDate, miles, purpose },
        })
        if (pendingFile) {
          await uploadPendingAttachment(pendingFile, 'mileage', result.id)
        }
      }
      await onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
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
            autoFocus={!isEdit}
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
      {!isEdit && (
        <PendingFileField file={pendingFile} onFileChange={setPendingFile} />
      )}

      <p className="text-[13px] text-[var(--color-ink-soft)]">
        IRS rate for {rateYear}: {formatCentsPerMile(rateCents)}¢/mile
      </p>

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
        <Button intent="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button intent="brand" type="submit" disabled={busy || computed <= 0}>
          {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Log trip'}
        </Button>
      </div>
    </form>
  )
}
