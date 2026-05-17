import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'

export const listAttachments = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z
      .object({
        sourceType: z.enum(['invoice', 'cash_receipt', 'mileage']),
        sourceId: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { attachments } = await import('~/db/schema')
    const { and, eq } = await import('drizzle-orm')
    return db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.sourceType, data.sourceType),
          eq(attachments.sourceId, data.sourceId),
        ),
      )
  })

export const deleteAttachment = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { attachments } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    const { deleteObject } = await import('~/lib/storage.server')

    const [row] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, data.id))
    if (!row) throw new Error('Attachment not found.')
    await deleteObject(row.storageKey)
    db.delete(attachments).where(eq(attachments.id, data.id)).run()
    return { ok: true }
  })

export async function deleteAttachmentsForSource(
  sourceType: 'invoice' | 'cash_receipt' | 'mileage',
  sourceId: string,
) {
  const { db } = await import('~/db/client')
  const { attachments } = await import('~/db/schema')
  const { and, eq } = await import('drizzle-orm')
  const { deleteObject } = await import('~/lib/storage.server')
  const rows = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.sourceType, sourceType),
        eq(attachments.sourceId, sourceId),
      ),
    )
  for (const row of rows) {
    await deleteObject(row.storageKey)
    db.delete(attachments).where(eq(attachments.id, row.id)).run()
  }
}

export async function registerAttachment(input: {
  sourceType: 'invoice' | 'cash_receipt' | 'mileage'
  sourceId: string
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
}) {
  const { db } = await import('~/db/client')
  const { attachments } = await import('~/db/schema')
  const id = newId('att')
  db.insert(attachments)
    .values({
      id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      storageKey: input.storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    })
    .run()
  return id
}
