import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? './data/simple-books.db'

export default defineConfig({
  out: './drizzle',
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  dialect: 'sqlite',
  dbCredentials: { url },
})
