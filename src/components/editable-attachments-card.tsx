import { useEffect, useState } from 'react'
import { Card, CardBody, Button, Icon } from '~/components/ui'
import { deleteAttachment } from '~/server/attachments.functions'
import { uploadPendingAttachment } from '~/components/attachment-upload'

type SourceType = 'invoice' | 'cash_receipt' | 'mileage'

interface AttachmentItem {
  id: string
  fileName: string
}

export function EditableAttachmentsCard({
  items: propItems,
  sourceType,
  sourceId,
  onChanged,
}: {
  items: AttachmentItem[]
  sourceType: SourceType
  sourceId: string
  onChanged?: () => void
}) {
  const [items, setItems] = useState(propItems)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync local state when props change (e.g. after router.invalidate)
  useEffect(() => {
    setItems(propItems)
  }, [propItems])

  async function handleDelete(id: string, fileName: string) {
    if (!confirm(`Delete attachment "${fileName}"?`)) return
    setDeleting(id)
    setError(null)
    try {
      await deleteAttachment({ data: { id } })
      setItems((prev) => prev.filter((a) => a.id !== id))
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(null)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      await uploadPendingAttachment(file, sourceType, sourceId)
      // Re-fetch isn't ideal but keeps things simple; parent can invalidate
      onChanged?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  return (
    <Card>
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h3 className="text-[14px] font-semibold">Supporting documents</h3>
      </div>
      <CardBody>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-faint)]">None attached.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <a
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-brand)] hover:underline min-w-0 truncate"
                >
                  <Icon
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6"
                    size={14}
                  />
                  <span className="truncate">{a.fileName}</span>
                </a>
                <Button
                  intent="danger"
                  type="button"
                  className="shrink-0 !px-2 !py-1 text-[12px]"
                  disabled={deleting === a.id}
                  onClick={() => handleDelete(a.id, a.fileName)}
                >
                  {deleting === a.id ? 'Deleting…' : 'Delete'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          <label className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-brand)] cursor-pointer hover:underline">
            <Icon d="M12 4v16M4 12h16" size={14} />
            {uploading ? 'Uploading…' : 'Add document'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {error && (
          <p className="text-[12px] text-[var(--color-negative)] mt-2">{error}</p>
        )}
      </CardBody>
    </Card>
  )
}
