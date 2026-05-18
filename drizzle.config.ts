import { defineConfig } from 'drizzle-kit'
import { isPostgres, sqliteLibsqlUrl } from './src/db/dialect'

const postgres = isPostgres()

export default defineConfig({
  out: postgres ? './drizzle/pg' : './drizzle',
  schema: postgres
    ? ['./src/db/schema.pg.ts', './src/db/auth-schema.pg.ts']
    : ['./src/db/schema.sqlite.ts', './src/db/auth-schema.sqlite.ts'],
  dialect: postgres ? 'postgresql' : 'sqlite',
  dbCredentials: postgres
    ? { url: process.env.DATABASE_URL! }
    : { url: sqliteLibsqlUrl() },
})
