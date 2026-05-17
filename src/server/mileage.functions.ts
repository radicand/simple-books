import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '~/db/client.server'
import { mileageEntries, settings } from '~/db/schema'
import { ensureSession } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import { parseQuantityToMicro, MICRO } from '~/lib/money'
import { postJournalSync } from '~/server/invoices.functions'
import { ACCT } from '~/server/posting.server'

const createSchema = z.object({
  tripDate: z.string(),
  miles: z.string().min(1),
  rateCentsPerMile: z.number().int().min(0).max(500).optional(),
  purpose: z.string().min(1).max(300),
})

export const getMileageRateCentsPerMile = createServerFn({ method: 'GET' }).handler(
  async () => {
    await ensureSession()
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'mileage_rate_cents_per_mile'))
    return Number(row?.value ?? 70)
  },
)

export const setMileageRateCentsPerMile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ cents: z.number().int().min(0).max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSession()
    db.run(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // upsert
      // (drizzle's onConflictDoUpdate is fine, but raw is simplest)
      // @ts-expect-error sql tag fine
      (await import('drizzle-orm')).sql`INSERT INTO settings (key, value) VALUES ('mileage_rate_cents_per_mile', ${String(data.cents)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    return { ok: true }
  })

export const listMileage = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSession()
  return db.select().from(mileageEntries).orderBy(desc(mileageEntries.tripDate))
})

export const createMileage = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const milesMicro = parseQuantityToMicro(data.miles)
    if (milesMicro <= 0) throw new Error('Miles must be > 0.')
    // default to current setting if not provided
    const [setRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'mileage_rate_cents_per_mile'))
    const rateCents =
      data.rateCentsPerMile ?? Number(setRow?.value ?? 70)
    const rateMicroPerMile = rateCents * 10_000 // cents/mi × 10_000 = $/mi × 1e6
    // amount = miles × $/mi → cents = miles × rateCents
    // milesMicro × rateCents / 1e6  (rateCents is cents/mile, exact integer)
    const product = BigInt(milesMicro) * BigInt(rateCents)
    const half = 500_000n
    const amountCents = Number(
      product >= 0n ? (product + half) / 1_000_000n : -((-product + half) / 1_000_000n),
    )
    if (amountCents <= 0) throw new Error('Computed mileage amount is zero.')

    const id = newId('mil')
    db.transaction((tx) => {
      tx.insert(mileageEntries)
        .values({
          id,
          tripDate: data.tripDate,
          milesMicro,
          rateMicroPerMile,
          purpose: data.purpose.trim(),
          amountCents,
        })
        .run()
      postJournalSync(tx, {
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
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const [m] = await db.select().from(mileageEntries).where(eq(mileageEntries.id, data.id))
    if (!m) throw new Error('Mileage entry not found.')
    db.transaction((tx) => {
      postJournalSync(tx, {
        date: m.tripDate,
        memo: `Reverse mileage ${m.id}`,
        source: 'reversal',
        sourceId: m.id,
        lines: [
          { accountCode: ACCT.OWNERS_CONTRIBUTION, debitCents: m.amountCents },
          { accountCode: ACCT.VEHICLE_EXPENSE, creditCents: m.amountCents },
        ],
      })
      tx.delete(mileageEntries).where(eq(mileageEntries.id, data.id)).run()
    })
    return { ok: true }
  })
