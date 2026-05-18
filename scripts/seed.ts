/**
 * Seed the chart of accounts and default settings. Idempotent — safe to run
 * repeatedly. Does NOT create users; first user is created via the UI.
 */
import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { sql } from 'drizzle-orm'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import postgres from 'postgres'
import { isPostgres, sqliteLibsqlUrl } from '../src/db/dialect'
import { chartAccounts, mileageRates, settings } from '../src/db/schema'

function createSeedDb() {
  if (isPostgres()) {
    const sqlClient = postgres(process.env.DATABASE_URL!, { max: 1 })
    return { db: drizzlePostgres(sqlClient), close: () => sqlClient.end() }
  }
  const url = sqliteLibsqlUrl()
  const filePath = url.replace(/^file:/, '')
  mkdirSync(dirname(filePath), { recursive: true })
  const client = createClient({ url })
  return { db: drizzleLibsql(client), close: () => client.close() }
}

const { db, close } = createSeedDb()

const accounts = [
  { code: '1000', name: 'Cash', type: 'asset', normal: 'debit' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', normal: 'debit' },
  { code: '3000', name: "Owner's Equity", type: 'equity', normal: 'credit' },
  {
    code: '3010',
    name: "Owner's Contribution",
    type: 'equity',
    normal: 'credit',
  },
  { code: '3020', name: "Owner's Draw", type: 'equity', normal: 'debit' },
  {
    code: '4000',
    name: 'Services Revenue',
    type: 'revenue',
    normal: 'credit',
  },
  {
    code: '6100',
    name: 'Vehicle / Mileage Expense',
    type: 'expense',
    normal: 'debit',
  },
] as const

for (const a of accounts) {
  await db.run(
    sql`INSERT INTO chart_accounts (code, name, type, normal) VALUES (${a.code}, ${a.name}, ${a.type}, ${a.normal}) ON CONFLICT(code) DO UPDATE SET name = excluded.name, type = excluded.type, normal = excluded.normal`,
  )
}

const defaults: Record<string, string> = {
  fiscal_year_start_month: '1',
}
for (const [k, v] of Object.entries(defaults)) {
  await db.run(
    sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT(key) DO NOTHING`,
  )
}

const irsMileageRates: Array<[number, number]> = [
  [2023, 655_000],
  [2024, 670_000],
  [2025, 700_000],
  [2026, 725_000],
]
for (const [year, micro] of irsMileageRates) {
  await db.run(
    sql`INSERT INTO mileage_rates (tax_year, rate_micro_per_mile) VALUES (${year}, ${micro}) ON CONFLICT(tax_year) DO NOTHING`,
  )
}

await close()
console.log('✓ Seeded chart of accounts and default settings.')
