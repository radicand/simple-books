import { and, eq, sql } from 'drizzle-orm'
import { db } from '~/db/client'
import {
  attachments,
  cashReceipts,
  invoices,
  mileageEntries,
} from '~/db/schema'
import { normalizeSourceId } from '~/lib/attachment-security'
import { newId } from '~/lib/ids'
import { deleteObject } from '~/lib/storage.server'

async function findMileageId(sourceId: string): Promise<string | null> {
  const trimmed = sourceId.trim()
  const [exact] = await db
    .select({ id: mileageEntries.id })
    .from(mileageEntries)
    .where(eq(mileageEntries.id, trimmed))
  if (exact) return exact.id

  const normalized = normalizeSourceId(trimmed)
  if (normalized !== trimmed) {
    const [norm] = await db
      .select({ id: mileageEntries.id })
      .from(mileageEntries)
      .where(eq(mileageEntries.id, normalized))
    if (norm) return norm.id
  }

  const [ci] = await db
    .select({ id: mileageEntries.id })
    .from(mileageEntries)
    .where(sql`lower(${mileageEntries.id}) = lower(${trimmed})`)
  return ci?.id ?? null
}

/** Returns the canonical id stored in the database. */
export async function assertSourceExists(
  sourceType: 'invoice' | 'cash_receipt' | 'mileage',
  sourceId: string,
): Promise<string> {
  if (sourceType === 'invoice') {
    const [row] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.id, sourceId.trim()))
    if (!row) throw new Error('Invoice not found.')
    return row.id
  }
  if (sourceType === 'cash_receipt') {
    const [row] = await db
      .select({ id: cashReceipts.id })
      .from(cashReceipts)
      .where(eq(cashReceipts.id, sourceId.trim()))
    if (!row) throw new Error('Receipt not found.')
    return row.id
  }
  const id = await findMileageId(sourceId)
  if (!id) throw new Error('Mileage entry not found.')
  return id
}

export async function deleteAttachmentsForSource(
  sourceType: 'invoice' | 'cash_receipt' | 'mileage',
  sourceId: string,
) {
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
    await db.delete(attachments).where(eq(attachments.id, row.id))
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
  const id = newId('att')
  await db.insert(attachments).values({
    id,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    storageKey: input.storageKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  })
  return id
}
