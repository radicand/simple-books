type DatabaseEnv = Record<string, string | undefined>

const DEFAULT_POSTGRES_USER = 'simplebooks'
const DEFAULT_POSTGRES_DB = 'simplebooks'
const DEFAULT_POSTGRES_PORT = '5432'

/** Full database URL, deriving one from split Postgres env vars when needed. */
export function databaseUrl(env: DatabaseEnv = process.env): string | undefined {
  if (env.DATABASE_URL) return env.DATABASE_URL
  if (!env.POSTGRES_HOST) return undefined

  const user = encodeURIComponent(env.POSTGRES_USER ?? DEFAULT_POSTGRES_USER)
  const password = env.POSTGRES_PASSWORD ? `:${encodeURIComponent(env.POSTGRES_PASSWORD)}` : ''
  const host = env.POSTGRES_HOST
  const port = env.POSTGRES_PORT ?? DEFAULT_POSTGRES_PORT
  const db = encodeURIComponent(env.POSTGRES_DB ?? DEFAULT_POSTGRES_DB)

  return `postgresql://${user}${password}@${host}:${port}/${db}`
}

/** True when the configured database points at PostgreSQL (recommended for production). */
export function isPostgres(url = databaseUrl()): boolean {
  if (!url) return false
  return /^postgres(ql)?:\/\//i.test(url)
}

/** LibSQL file URL for local SQLite (async Drizzle API). */
export function sqliteLibsqlUrl(url = databaseUrl()): string {
  const raw = url ?? './data/simple-books.db'
  if (raw.startsWith('file:')) return raw
  if (raw.startsWith('libsql:')) return raw
  return `file:${raw}`
}

export function migrationsFolder(): string {
  return isPostgres() ? './drizzle/pg' : './drizzle'
}
