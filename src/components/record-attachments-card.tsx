import { Card, CardBody } from '~/components/ui'
import { AttachmentList } from '~/components/attachment-upload'

export function RecordAttachmentsCard({
  items,
}: {
  items: Array<{ id: string; fileName: string }>
}) {
  return (
    <Card>
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <h3 className="text-[14px] font-semibold">Supporting documents</h3>
      </div>
      <CardBody>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-faint)]">None attached.</p>
        ) : (
          <AttachmentList items={items} />
        )}
      </CardBody>
    </Card>
  )
}
