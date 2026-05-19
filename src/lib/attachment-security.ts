/** Client-safe helpers for attachment paths and download headers. */

const STRICT_SOURCE_ID_RE = /^(inv|rcp|mil)_[0-9A-HJKMNP-TV-Z]{16}$/
const PREFIXED_SOURCE_ID_RE = /^(inv|rcp|mil)_[a-zA-Z0-9_-]+$/
const MAX_PREFIXED_SOURCE_ID_LEN = 72

const STORAGE_KEY_RE =
  /^(invoice|cash_receipt|mileage)\/(inv|rcp|mil)_[a-zA-Z0-9_-]+\/blob_[0-9A-HJKMNP-TV-Z]{16}$/

/** Uppercase Crockford suffix; keeps inv_|rcp_|mil_ prefix as sent. */
export function normalizeSourceId(id: string): string {
  const s = id.trim()
  const sep = s.indexOf('_')
  if (sep <= 0) return s
  return `${s.slice(0, sep + 1)}${s.slice(sep + 1).toUpperCase()}`
}

export function assertSafeSourceId(id: string): void {
  const s = id.trim()
  if (!s || s === 'undefined' || s === 'null' || s.includes('..')) {
    throw new Error('Invalid source id.')
  }
  if (STRICT_SOURCE_ID_RE.test(s)) return
  const normalized = normalizeSourceId(s)
  if (
    PREFIXED_SOURCE_ID_RE.test(normalized) &&
    normalized.length <= MAX_PREFIXED_SOURCE_ID_LEN
  ) {
    return
  }
  throw new Error('Invalid source id.')
}

export function assertSafeStorageKey(key: string): void {
  if (!STORAGE_KEY_RE.test(key)) {
    throw new Error('Invalid storage key.')
  }
}

export function buildStorageKey(
  sourceType: 'invoice' | 'cash_receipt' | 'mileage',
  sourceId: string,
  blobId: string,
): string {
  assertSafeSourceId(sourceId)
  if (!/^blob_[0-9A-HJKMNP-TV-Z]{16}$/.test(blobId)) {
    throw new Error('Invalid blob id.')
  }
  const key = `${sourceType}/${sourceId}/${blobId}`
  assertSafeStorageKey(key)
  return key
}

export function safeContentDispositionFilename(name: string): string {
  const trimmed = name.trim().replace(/[\r\n";]/g, '_').slice(0, 200)
  const base = trimmed || 'attachment'
  const encoded = encodeURIComponent(base)
  return `attachment; filename="${base}"; filename*=UTF-8''${encoded}`
}
