import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { migrate as migrateLibsql } from 'drizzle-orm/libsql/migrator'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import postgres from 'postgres'
import { isPostgres, migrationsFolder, sqliteLibsqlUrl } from '../src/db/dialect'

const folder = migrationsFolder()

if (isPostgres()) {
  const url = process.env.DATABASE_URL!
  const sql = postgres(url, { max: 1 })
  const db = drizzlePostgres(sql)
  await migratePostgres(db, { migrationsFolder: folder })
  await sql.end()
  console.log('✓ Migrations applied to PostgreSQL')
} else {
  const url = sqliteLibsqlUrl()
  const filePath = url.replace(/^file:/, '')
  mkdirSync(dirname(filePath), { recursive: true })
  const client = createClient({ url })
  const db = drizzleLibsql(client)
  await migrateLibsql(db, { migrationsFolder: folder })
  client.close()
  console.log('✓ Migrations applied to', filePath)
}
