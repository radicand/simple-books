import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle/pg',
  schema: ['./src/db/schema.pg.ts', './src/db/auth-schema.pg.ts'],
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
