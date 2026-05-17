import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { db } from '~/db/client.server'
import { serviceProducts } from '~/db/schema'
import { ensureSession } from '~/lib/auth.functions'
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

export const listServices = createServerFn({ method: 'GET' }).handler(
  async () => {
    await ensureSession()
    return db
      .select()
      .from(serviceProducts)
      .orderBy(desc(serviceProducts.active), serviceProducts.name)
  },
)

export const createService = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
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

export const updateService = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
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

export const toggleService = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    await ensureSession()
    await db
      .update(serviceProducts)
      .set({ active: data.active })
      .where(eq(serviceProducts.id, data.id))
    return { ok: true }
  })
