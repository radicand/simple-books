import { defineConfig } from 'drizzle-kit'
import { sqliteLibsqlUrl } from './src/db/dialect'

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.sqlite.ts', './src/db/auth-schema.sqlite.ts'],
  dialect: 'sqlite',
  dbCredentials: { url: sqliteLibsqlUrl() },
})
