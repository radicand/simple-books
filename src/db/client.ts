import '@tanstack/react-start/server-only'
import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import postgres from 'postgres'
import { isPostgres, sqliteLibsqlUrl } from './dialect'
import { authSchema, businessSchema, fullSchema } from './tables'

function createDb() {
  if (isPostgres()) {
    const url = process.env.DATABASE_URL!
    const sql = postgres(url, { max: 10 })
    return drizzlePostgres(sql, { schema: fullSchema })
  }

  const url = sqliteLibsqlUrl()
  const filePath = url.replace(/^file:/, '')
  mkdirSync(dirname(filePath), { recursive: true })
  const client = createClient({ url })
  return drizzleLibsql(client, { schema: fullSchema })
}

export const db = createDb()
export type DB = typeof db

export { businessSchema, authSchema, isPostgres }
