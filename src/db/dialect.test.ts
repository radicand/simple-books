import { describe, expect, test } from 'bun:test'
import { databaseUrl, isPostgres, migrationsFolder } from './dialect'

describe('databaseUrl', () => {
  test('prefers split Postgres env over SQLite DATABASE_URL', () => {
    const url = databaseUrl({
      DATABASE_URL: '/app/data/simple-books.db',
      POSTGRES_HOST: 'simple-books-postgresql',
      POSTGRES_PORT: '5433',
      POSTGRES_USER: 'simple books',
      POSTGRES_PASSWORD: 'p@ss word',
      POSTGRES_DB: 'books/prod',
    })

    expect(url).toBe(
      'postgresql://simple%20books:p%40ss%20word@simple-books-postgresql:5433/books%2Fprod',
    )
    expect(isPostgres(url)).toBe(true)
    expect(migrationsFolder(url)).toBe('./drizzle/pg')
  })

  test('keeps split Postgres defaults for user, port, and db', () => {
    const url = databaseUrl({ POSTGRES_HOST: 'db' })

    expect(url).toBe('postgresql://simplebooks@db:5432/simplebooks')
    expect(isPostgres(url)).toBe(true)
  })

  test('uses SQLite DATABASE_URL when split Postgres env is absent', () => {
    const url = databaseUrl({ DATABASE_URL: './data/simple-books.db' })

    expect(url).toBe('./data/simple-books.db')
    expect(isPostgres(url)).toBe(false)
    expect(migrationsFolder(url)).toBe('./drizzle')
  })

  test('uses explicit Postgres DATABASE_URL when split Postgres env is absent', () => {
    const url = databaseUrl({
      DATABASE_URL: 'postgres://simplebooks:secret@db:5432/simplebooks',
    })

    expect(url).toBe('postgres://simplebooks:secret@db:5432/simplebooks')
    expect(isPostgres(url)).toBe(true)
    expect(migrationsFolder(url)).toBe('./drizzle/pg')
  })

  test('returns undefined when no database env is set', () => {
    const url = databaseUrl({})

    expect(url).toBeUndefined()
    expect(isPostgres(url)).toBe(false)
    expect(migrationsFolder(url)).toBe('./drizzle')
  })
})
