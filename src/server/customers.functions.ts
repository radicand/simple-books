import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '~/db/client.server'
import { customers } from '~/db/schema'
import { ensureSession } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(160),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const listCustomers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await ensureSession()
    return db.select().from(customers).orderBy(customers.name)
  },
)

export const getCustomer = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const [row] = await db.select().from(customers).where(eq(customers.id, data.id))
    if (!row) throw new Error('Customer not found.')
    return row
  })

export const createCustomer = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const id = data.id ?? newId('cus')
    await db.insert(customers).values({
      id,
      name: data.name.trim(),
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
    })
    return { id }
  })

export const updateCustomer = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => upsertSchema.required({ id: true }).parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    await db
      .update(customers)
      .set({
        name: data.name.trim(),
        email: data.email?.trim() || null,
        notes: data.notes?.trim() || null,
      })
      .where(eq(customers.id, data.id!))
    return { ok: true }
  })
