import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import {
  microPerMileToCents,
  taxYearFromDate,
} from '~/lib/mileage-rates'
import { parseQuantityToMicro } from '~/lib/money'
import { postJournalSync, ACCT } from '~/server/posting'

const FALLBACK_MICRO = 725_000

async function resolveRateMicroPerMile(tripDate: string): Promise<number> {
  const { db } = await import('~/db/client')
  const { mileageRates } = await import('~/db/schema')
  const { eq } = await import('drizzle-orm')
  const year = taxYearFromDate(tripDate)
  const [row] = await db
    .select()
    .from(mileageRates)
    .where(eq(mileageRates.taxYear, year))
  return row?.rateMicroPerMile ?? FALLBACK_MICRO
}

const createSchema = z.object({
  tripDate: z.string(),
  miles: z.string().min(1),
  purpose: z.string().min(1).max(300),
})

export const getMileageRateCentsPerMile = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    const year = new Date().getFullYear()
    const { db } = await import('~/db/client')
    const { mileageRates } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select()
      .from(mileageRates)
      .where(eq(mileageRates.taxYear, year))
    return microPerMileToCents(row?.rateMicroPerMile ?? FALLBACK_MICRO)
  })

export const listMileage = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    const { db } = await import('~/db/client')
    const { mileageEntries } = await import('~/db/schema')
    const { desc } = await import('drizzle-orm')
    return db.select().from(mileageEntries).orderBy(desc(mileageEntries.tripDate))
  })

export const getMileage = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { mileageEntries } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select()
      .from(mileageEntries)
      .where(eq(mileageEntries.id, data.id))
    if (!row) throw new Error('Mileage entry not found.')
    return row
  })

export const createMileage = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { mileageEntries } = await import('~/db/schema')

    const milesMicro = parseQuantityToMicro(data.miles)
    if (milesMicro <= 0) throw new Error('Miles must be > 0.')
    const rateMicroPerMile = await resolveRateMicroPerMile(data.tripDate)
    const product = BigInt(milesMicro) * BigInt(rateMicroPerMile)
    const half = 5_000_000_000n
    const amountCents = Number(
      product >= 0n
        ? (product + half) / 10_000_000_000n
        : -((-product + half) / 10_000_000_000n),
    )
    if (amountCents <= 0) throw new Error('Computed mileage amount is zero.')

    const id = newId('mil')
    await db.transaction(async (tx) => {
      await tx.insert(mileageEntries).values({
        id,
        tripDate: data.tripDate,
        milesMicro,
        rateMicroPerMile,
        purpose: data.purpose.trim(),
        amountCents,
      })
      await postJournalSync(tx, {
        date: data.tripDate,
        memo: `Mileage: ${data.purpose.trim()}`,
        source: 'mileage',
        sourceId: id,
        lines: [
          { accountCode: ACCT.VEHICLE_EXPENSE, debitCents: amountCents },
          { accountCode: ACCT.OWNERS_CONTRIBUTION, creditCents: amountCents },
        ],
      })
    })
    return { id, amountCents }
  })

export const deleteMileage = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { mileageEntries } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')

    const [m] = await db
      .select()
      .from(mileageEntries)
      .where(eq(mileageEntries.id, data.id))
    if (!m) throw new Error('Mileage entry not found.')
    const { deleteAttachmentsForSource } = await import('~/server/attachments.server')
    await deleteAttachmentsForSource('mileage', data.id)
    await db.transaction(async (tx) => {
      await postJournalSync(tx, {
        date: m.tripDate,
        memo: `Reverse mileage ${m.id}`,
        source: 'reversal',
        sourceId: m.id,
        lines: [
          { accountCode: ACCT.OWNERS_CONTRIBUTION, debitCents: m.amountCents },
          { accountCode: ACCT.VEHICLE_EXPENSE, creditCents: m.amountCents },
        ],
      })
      await tx.delete(mileageEntries).where(eq(mileageEntries.id, data.id))
    })
    return { ok: true }
  })

export const updateMileage = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => createSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { mileageEntries } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')

    const [m] = await db
      .select()
      .from(mileageEntries)
      .where(eq(mileageEntries.id, data.id))
    if (!m) throw new Error('Mileage entry not found.')

    const milesMicro = parseQuantityToMicro(data.miles)
    if (milesMicro <= 0) throw new Error('Miles must be > 0.')
    const rateMicroPerMile = await resolveRateMicroPerMile(data.tripDate)
    const product = BigInt(milesMicro) * BigInt(rateMicroPerMile)
    const half = 5_000_000_000n
    const amountCents = Number(
      product >= 0n
        ? (product + half) / 10_000_000_000n
        : -((-product + half) / 10_000_000_000n),
    )
    if (amountCents <= 0) throw new Error('Computed mileage amount is zero.')

    await db.transaction(async (tx) => {
      await postJournalSync(tx, {
        date: m.tripDate,
        memo: `Reverse mileage ${m.id}`,
        source: 'reversal',
        sourceId: m.id,
        lines: [
          { accountCode: ACCT.OWNERS_CONTRIBUTION, debitCents: m.amountCents },
          { accountCode: ACCT.VEHICLE_EXPENSE, creditCents: m.amountCents },
        ],
      })
      await tx
        .update(mileageEntries)
        .set({
          tripDate: data.tripDate,
          milesMicro,
          rateMicroPerMile,
          purpose: data.purpose.trim(),
          amountCents,
        })
        .where(eq(mileageEntries.id, data.id))
      await postJournalSync(tx, {
        date: data.tripDate,
        memo: `Mileage: ${data.purpose.trim()}`,
        source: 'mileage',
        sourceId: data.id,
        lines: [
          { accountCode: ACCT.VEHICLE_EXPENSE, debitCents: amountCents },
          { accountCode: ACCT.OWNERS_CONTRIBUTION, creditCents: amountCents },
        ],
      })
    })
    return { id: data.id, amountCents }
  })
