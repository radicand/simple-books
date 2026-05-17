/**
 * Seed the chart of accounts and default settings. Idempotent — safe to run
 * repeatedly. Does NOT create users; first user is created via the UI.
 */
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { chartAccounts, settings } from '../src/db/schema'
import { sql } from 'drizzle-orm'

const dbPath = process.env.DATABASE_URL ?? './data/simple-books.db'
const sqlite = new Database(dbPath, { create: true })
sqlite.exec('PRAGMA foreign_keys = ON;')
const db = drizzle(sqlite)

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
  db.run(
    sql`INSERT INTO chart_accounts (code, name, type, normal) VALUES (${a.code}, ${a.name}, ${a.type}, ${a.normal}) ON CONFLICT(code) DO UPDATE SET name = excluded.name, type = excluded.type, normal = excluded.normal`,
  )
}

const defaults: Record<string, string> = {
  // IRS 2025 standard business mileage rate = $0.70/mile. Stored in cents per mile.
  mileage_rate_cents_per_mile: '70',
  fiscal_year_start_month: '1',
}
for (const [k, v] of Object.entries(defaults)) {
  db.run(
    sql`INSERT INTO settings (key, value) VALUES (${k}, ${v}) ON CONFLICT(key) DO NOTHING`,
  )
}

console.log('✓ Seeded chart of accounts and default settings.')
sqlite.close()
