import '@tanstack/react-start/server-only'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import * as schema from './schema'
import * as authSchema from './auth-schema'

const dbPath = process.env.DATABASE_URL ?? './data/simple-books.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath, { create: true })
sqlite.exec('PRAGMA journal_mode = WAL;')
sqlite.exec('PRAGMA foreign_keys = ON;')
sqlite.exec('PRAGMA busy_timeout = 5000;')

export const db = drizzle({
  client: sqlite,
  schema: { ...schema, ...authSchema },
})
export type DB = typeof db
export { sqlite }
