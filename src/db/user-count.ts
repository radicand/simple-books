import { count } from 'drizzle-orm'
import { db } from './client'
import { user } from './auth-schema'

export async function countUsers(): Promise<number> {
  const [row] = await db.select({ c: count() }).from(user)
  return Number(row?.c ?? 0)
}
