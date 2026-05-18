/** True when DATABASE_URL points at PostgreSQL (recommended for production). */
export function isPostgres(databaseUrl = process.env.DATABASE_URL): boolean {
  if (!databaseUrl) return false
  return /^postgres(ql)?:\/\//i.test(databaseUrl)
}

/** LibSQL file URL for local SQLite (async Drizzle API). */
export function sqliteLibsqlUrl(databaseUrl = process.env.DATABASE_URL): string {
  const raw = databaseUrl ?? './data/simple-books.db'
  if (raw.startsWith('file:')) return raw
  if (raw.startsWith('libsql:')) return raw
  return `file:${raw}`
}

export function migrationsFolder(): string {
  return isPostgres() ? './drizzle/pg' : './drizzle'
}
