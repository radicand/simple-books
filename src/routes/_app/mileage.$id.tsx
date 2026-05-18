import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import {
  PageHeader,
  Card,
  CardBody,
  Button,
  Money,
  Icon,
} from '~/components/ui'
import { getMileage, deleteMileage } from '~/server/mileage.functions'
import { listAttachments } from '~/server/attachments.functions'
import { RecordAttachmentsCard } from '~/components/record-attachments-card'
import { fmtDateLong } from '~/lib/date'
import { microToDecimal } from '~/lib/money'

export const Route = createFileRoute('/_app/mileage/$id')({
  loader: async ({ params }) => {
    const [entry, attachments] = await Promise.all([
      getMileage({ data: { id: params.id } }),
      listAttachments({ data: { sourceType: 'mileage', sourceId: params.id } }),
    ])
    return { entry, attachments }
  },
  component: MileageDetail,
})

function MileageDetail() {
  const { entry, attachments } = Route.useLoaderData()
  const router = useRouter()

  async function del() {
    if (!confirm('Delete this mileage entry?')) return
    await deleteMileage({ data: { id: entry.id } })
    router.navigate({ to: '/mileage' })
  }

  return (
    <>
      <PageHeader
        title={entry.purpose}
        subtitle={fmtDateLong(entry.tripDate)}
        actions={
          <>
            <Link to="/mileage">
              <Button intent="ghost">
                <Icon d="M15 18l-6-6 6-6" size={16} /> Back
              </Button>
            </Link>
            <Button intent="danger" onClick={del}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardBody>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Miles
                </dt>
                <dd className="tabular font-medium">{microToDecimal(entry.milesMicro, 1)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Rate
                </dt>
                <dd className="tabular text-[var(--color-ink-soft)]">
                  ${(entry.rateMicroPerMile / 1_000_000).toFixed(2)}/mi
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium mb-1">
                  Deduction
                </dt>
                <dd>
                  <Money cents={entry.amountCents} className="text-[22px] font-semibold" />
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <RecordAttachmentsCard
          items={attachments.map((a) => ({ id: a.id, fileName: a.fileName }))}
        />
      </div>
    </>
  )
}
