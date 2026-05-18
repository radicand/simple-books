import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'

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
