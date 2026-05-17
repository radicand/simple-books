import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { parseDollarsToCents } from '~/lib/money'
import { newId } from '~/lib/ids'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  unit: z.string().min(1).max(40),
  rate: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
})

const updateSchema = createSchema.extend({
  id: z.string(),
  active: z.boolean().optional(),
})

export const listServices = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware]).handler(
  async () => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { serviceProducts } = await import('~/db/schema')
    const { desc } = await import('drizzle-orm')
    return db
      .select()
      .from(serviceProducts)
      .orderBy(desc(serviceProducts.active), serviceProducts.name)
  },
)

export const createService = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { serviceProducts } = await import('~/db/schema')
    const id = newId('svc')
    await db.insert(serviceProducts).values({
      id,
      name: data.name.trim(),
      unit: data.unit.trim(),
      rateCents: parseDollarsToCents(data.rate),
      description: data.description?.trim() || null,
      active: true,
    })
    return { id }
  })

export const updateService = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { serviceProducts } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(serviceProducts)
      .set({
        name: data.name.trim(),
        unit: data.unit.trim(),
        rateCents: parseDollarsToCents(data.rate),
        description: data.description?.trim() || null,
        active: data.active ?? true,
      })
      .where(eq(serviceProducts.id, data.id))
    return { ok: true }
  })

export const toggleService = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { serviceProducts } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(serviceProducts)
      .set({ active: data.active })
      .where(eq(serviceProducts.id, data.id))
    return { ok: true }
  })
