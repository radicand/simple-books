import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import {
  centsPerMileToMicro,
  microPerMileToCents,
  taxYearFromDate,
} from '~/lib/mileage-rates'

const FALLBACK_MICRO = 725_000 // 72.5¢/mi (2026 IRS)

export const listMileageRates = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    const { db } = await import('~/db/client')
    const { mileageRates } = await import('~/db/schema')
    const { desc } = await import('drizzle-orm')
    return db.select().from(mileageRates).orderBy(desc(mileageRates.taxYear))
  })

export const upsertMileageRate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z
      .object({
        taxYear: z.number().int().min(2000).max(2100),
        centsPerMile: z.number().min(0).max(500),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { mileageRates } = await import('~/db/schema')
    const rateMicroPerMile = centsPerMileToMicro(data.centsPerMile)
    db.insert(mileageRates)
      .values({ taxYear: data.taxYear, rateMicroPerMile })
      .onConflictDoUpdate({
        target: mileageRates.taxYear,
        set: { rateMicroPerMile, updatedAt: new Date() },
      })
      .run()
    return { ok: true }
  })

export const getMileageRateForDate = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z.object({ tripDate: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const year = taxYearFromDate(data.tripDate)
    const { db } = await import('~/db/client')
    const { mileageRates } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select()
      .from(mileageRates)
      .where(eq(mileageRates.taxYear, year))
    const rateMicroPerMile = row?.rateMicroPerMile ?? FALLBACK_MICRO
    return {
      taxYear: year,
      rateMicroPerMile,
      centsPerMile: microPerMileToCents(rateMicroPerMile),
    }
  })

export const getStorageConfig = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    return {
      s3Enabled: !!process.env.S3_ENDPOINT?.trim(),
    }
  })
