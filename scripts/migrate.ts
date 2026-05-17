import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const dbPath = process.env.DATABASE_URL ?? './data/simple-books.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath, { create: true })
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')
const db = drizzle(sqlite)

await migrate(db, { migrationsFolder: './drizzle' })

console.log('✓ Migrations applied to', dbPath)
sqlite.close()
