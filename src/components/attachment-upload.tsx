import { useState } from 'react'
import { Button, Field, Icon } from '~/components/ui'

type SourceType = 'invoice' | 'cash_receipt' | 'mileage'

export function AttachmentUpload({
  sourceType,
  sourceId,
  label = 'Supporting document',
  hint = 'Optional. Image or PDF for your records.',
}: {
  sourceType: SourceType
  sourceId?: string
  label?: string
  hint?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function upload(selected: File, id: string) {
    const form = new FormData()
    form.append('file', selected)
    form.append('sourceType', sourceType)
    form.append('sourceId', id)
    const res = await fetch('/api/attachments/upload', {
      method: 'POST',
      body: form,
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? 'Upload failed.')
    }
  }

  return (
    <Field label={label} hint={hint}>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="block w-full text-sm text-[var(--color-ink-soft)] file:mr-3 file:py-2 file:px-3 file:rounded-[10px] file:border file:border-[var(--color-border-strong)] file:bg-[var(--color-surface)] file:text-[var(--color-ink)] file:font-medium file:cursor-pointer min-h-11"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null)
          setStatus(null)
        }}
      />
      {file && !sourceId && (
        <p className="text-[12px] text-[var(--color-ink-faint)] mt-1">
          File will upload when you save the record.
        </p>
      )}
      {status && (
        <p className="text-[12px] text-[var(--color-brand-ink)] mt-1">{status}</p>
      )}
    </Field>
  )
}

export async function uploadPendingAttachment(
  file: File,
  sourceType: SourceType,
  sourceId: string,
) {
  const form = new FormData()
  form.append('file', file)
  form.append('sourceType', sourceType)
  form.append('sourceId', sourceId)
  const res = await fetch('/api/attachments/upload', {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? 'Upload failed.')
  }
}

export function AttachmentList({
  items,
}: {
  items: Array<{ id: string; fileName: string }>
}) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-1 mt-2">
      {items.map((a) => (
        <li key={a.id}>
          <a
            href={`/api/attachments/${a.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-brand)] hover:underline"
          >
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" size={14} />
            {a.fileName}
          </a>
        </li>
      ))}
    </ul>
  )
}
