import { describe, expect, test } from 'bun:test'
import {
  assertSafeSourceId,
  assertSafeStorageKey,
  buildStorageKey,
  normalizeSourceId,
  safeContentDispositionFilename,
} from './attachment-security'

describe('assertSafeSourceId', () => {
  test('accepts valid ids', () => {
    expect(() => assertSafeSourceId('inv_0123456789ABCDEF')).not.toThrow()
    expect(() => assertSafeSourceId('rcp_0123456789ABCDEF')).not.toThrow()
    expect(() => assertSafeSourceId('mil_0123456789ABCDEF')).not.toThrow()
  })

  test('accepts trimmed and lowercased suffix', () => {
    expect(() => assertSafeSourceId('  mil_0123456789abcdef  ')).not.toThrow()
  })

  test('rejects path traversal', () => {
    expect(() => assertSafeSourceId('../../../etc/passwd')).toThrow()
    expect(() => assertSafeSourceId('inv_../foo')).toThrow()
  })

  test('rejects missing id', () => {
    expect(() => assertSafeSourceId('')).toThrow()
    expect(() => assertSafeSourceId('undefined')).toThrow()
  })
})

describe('normalizeSourceId', () => {
  test('uppercases suffix', () => {
    expect(normalizeSourceId('mil_abc')).toBe('mil_ABC')
  })
})

describe('assertSafeStorageKey', () => {
  test('accepts valid keys', () => {
    const key =
      'invoice/inv_0123456789ABCDEF/blob_0123456789ABCDEF'
    expect(() => assertSafeStorageKey(key)).not.toThrow()
  })

  test('rejects traversal', () => {
    expect(() =>
      assertSafeStorageKey('invoice/../../../tmp/evil/blob_0123456789ABCDEF'),
    ).toThrow()
  })
})

describe('buildStorageKey', () => {
  test('builds validated key', () => {
    const key = buildStorageKey(
      'invoice',
      'inv_0123456789ABCDEF',
      'blob_0123456789ABCDEF',
    )
    expect(key).toBe(
      'invoice/inv_0123456789ABCDEF/blob_0123456789ABCDEF',
    )
  })

  test('builds mileage key', () => {
    const key = buildStorageKey(
      'mileage',
      'mil_0123456789ABCDEF',
      'blob_0123456789ABCDEF',
    )
    expect(key).toBe(
      'mileage/mil_0123456789ABCDEF/blob_0123456789ABCDEF',
    )
  })
})

describe('safeContentDispositionFilename', () => {
  test('sanitizes hostile filenames', () => {
    const header = safeContentDispositionFilename(
      'x.pdf"\r\nContent-Type: text/html\r\n\r\n',
    )
    expect(header).toStartWith('attachment; filename="')
    expect(header).not.toContain('\r')
    expect(header).not.toContain('\n')
    expect(header).toContain("filename*=UTF-8''")
  })
})
