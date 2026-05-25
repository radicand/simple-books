import { defineConfig } from 'drizzle-kit'
import { databaseUrl, isPostgres, requireDatabaseUrl, sqliteLibsqlUrl } from './src/db/dialect'

const url = databaseUrl()
const postgres = isPostgres(url)

export default defineConfig({
  out: postgres ? './drizzle/pg' : './drizzle',
  schema: postgres
    ? ['./src/db/schema.pg.ts', './src/db/auth-schema.pg.ts']
    : ['./src/db/schema.sqlite.ts', './src/db/auth-schema.sqlite.ts'],
  dialect: postgres ? 'postgresql' : 'sqlite',
  dbCredentials: postgres
    ? { url: requireDatabaseUrl() }
    : { url: sqliteLibsqlUrl(url) },
})
