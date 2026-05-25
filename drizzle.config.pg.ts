import { defineConfig } from 'drizzle-kit'
import { requireDatabaseUrl } from './src/db/dialect'

export default defineConfig({
  out: './drizzle/pg',
  schema: ['./src/db/schema.pg.ts', './src/db/auth-schema.pg.ts'],
  dialect: 'postgresql',
  dbCredentials: { url: requireDatabaseUrl() },
})
