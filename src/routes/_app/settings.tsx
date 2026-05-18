import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  PageHeader,
  Card,
  CardBody,
  Table,
  THead,
  Th,
  Tr,
  Td,
  Button,
  Input,
  Icon,
} from '~/components/ui'
import {
  listMileageRates,
  upsertMileageRate,
  getStorageConfig,
} from '~/server/settings.functions'
import { formatCentsPerMile, microPerMileToCents } from '~/lib/mileage-rates'

export const Route = createFileRoute('/_app/settings')({
  loader: async () => ({
    rates: await listMileageRates(),
    storage: await getStorageConfig(),
  }),
  component: SettingsPage,
})

function SettingsPage() {
  const { rates, storage } = Route.useLoaderData()
  const router = useRouter()
  const currentYear = new Date().getFullYear()
  const hasCurrentYear = rates.some((r) => r.taxYear === currentYear)
  const [addingYear, setAddingYear] = useState(false)
  const existingYears = new Set(rates.map((r) => r.taxYear))

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Configure rates and how this install stores supporting documents."
      />

      {storage.s3Enabled && (
        <Card className="mb-6 border-[var(--color-warning-border)] bg-[var(--color-warning-surface)]">
          <CardBody className="!py-4 text-[13.5px] text-[var(--color-ink-soft)] leading-relaxed">
            <strong className="text-[var(--color-ink)]">Document retention.</strong> Receipts and
            invoices are stored in your S3-compatible bucket. Configure bucket lifecycle rules so
            objects are kept for as long as the IRS may request records (often 3–7 years depending on
            your situation). Do not set aggressive expiration on audit-related files.{' '}
            <a
              href="https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-brand)] hover:underline"
            >
              IRS recordkeeping guidance
            </a>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="!py-4 border-b border-[var(--color-border)]">
          <h2 className="text-[15px] font-semibold tracking-tight">Mileage reimbursement</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)] leading-relaxed">
            IRS publishes standard business rates each year. Set the rate you use per calendar year.
            Each trip stores the rate in effect when you log it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <a
              href="https://www.irs.gov/newsroom"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[13px] text-[var(--color-brand)] hover:underline"
            >
              IRS announcements
              <Icon d="M7 17L17 7M17 7H9M17 7V15" size={14} />
            </a>
            {!addingYear && (
              <Button size="sm" intent="neutral" onClick={() => setAddingYear(true)}>
                <Icon d="M12 4v16M4 12h16" size={14} /> Add tax year
              </Button>
            )}
          </div>
        </CardBody>

        <Table>
          <THead>
            <tr>
              <Th>Tax year</Th>
              <Th className="text-right">Rate (¢/mile)</Th>
              <Th></Th>
            </tr>
          </THead>
          <tbody>
            {rates.map((r) => (
              <RateRow
                key={r.taxYear}
                taxYear={r.taxYear}
                centsPerMile={microPerMileToCents(r.rateMicroPerMile)}
                onSaved={() => router.invalidate()}
              />
            ))}
            {!hasCurrentYear && (
              <RateRow
                taxYear={currentYear}
                centsPerMile={72.5}
                onSaved={() => router.invalidate()}
                isNew
              />
            )}
            {addingYear && (
              <AddRateRow
                defaultYear={
                  [...Array.from({ length: 10 }, (_, i) => currentYear + i)].find(
                    (y) => !existingYears.has(y),
                  ) ?? currentYear + 1
                }
                existingYears={existingYears}
                onSaved={() => {
                  setAddingYear(false)
                  router.invalidate()
                }}
                onCancel={() => setAddingYear(false)}
              />
            )}
          </tbody>
        </Table>
      </Card>
    </>
  )
}

function AddRateRow({
  defaultYear,
  existingYears,
  onSaved,
  onCancel,
}: {
  defaultYear: number
  existingYears: Set<number>
  onSaved: () => void
  onCancel: () => void
}) {
  const [taxYear, setTaxYear] = useState(String(defaultYear))
  const [value, setValue] = useState('72.5')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const year = Number(taxYear)
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error('Enter a valid tax year (2000–2100).')
      }
      if (existingYears.has(year)) {
        throw new Error(`Rate for ${year} already exists. Edit that row instead.`)
      }
      const cents = Number(value)
      if (!Number.isFinite(cents) || cents < 0 || cents > 500) {
        throw new Error('Enter a valid rate in cents per mile (e.g. 72.5).')
      }
      await upsertMileageRate({ data: { taxYear: year, centsPerMile: cents } })
      onSaved()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tr>
      <Td>
        <Input
          type="number"
          min={2000}
          max={2100}
          className="tabular w-[100px]"
          value={taxYear}
          onChange={(e) => setTaxYear(e.target.value)}
        />
      </Td>
      <Td className="text-right">
        <Input
          type="number"
          step="0.1"
          min={0}
          max={500}
          className="tabular w-[100px] ml-auto"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Td>
      <Td className="text-right">
        <span className="inline-flex gap-1">
          <Button size="sm" intent="brand" disabled={busy} onClick={save}>
            Save
          </Button>
          <Button size="sm" intent="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </span>
      </Td>
    </Tr>
  )
}

function RateRow({
  taxYear,
  centsPerMile,
  onSaved,
  isNew,
}: {
  taxYear: number
  centsPerMile: number
  onSaved: () => void
  isNew?: boolean
}) {
  const [editing, setEditing] = useState(isNew ?? false)
  const [value, setValue] = useState(formatCentsPerMile(centsPerMile))
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const cents = Number(value)
      if (!Number.isFinite(cents) || cents < 0 || cents > 500) {
        throw new Error('Enter a valid rate in cents per mile (e.g. 72.5).')
      }
      await upsertMileageRate({ data: { taxYear, centsPerMile: cents } })
      setEditing(false)
      onSaved()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tr>
      <Td className="font-medium tabular">{taxYear}</Td>
      <Td className="text-right">
        {editing ? (
          <Input
            type="number"
            step="0.1"
            min={0}
            max={500}
            className="tabular w-[100px] ml-auto"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        ) : (
          <span className="tabular">{formatCentsPerMile(centsPerMile)}</span>
        )}
      </Td>
      <Td className="text-right">
        {editing ? (
          <span className="inline-flex gap-1">
            <Button size="sm" intent="brand" disabled={busy} onClick={save}>
              Save
            </Button>
            {!isNew && (
              <Button size="sm" intent="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </span>
        ) : (
          <Button size="sm" intent="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </Td>
    </Tr>
  )
}
