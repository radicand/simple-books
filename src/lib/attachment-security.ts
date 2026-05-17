/** Client-safe helpers for attachment paths and download headers. */

const SOURCE_ID_RE = /^(inv|rcp|mil)_[0-9A-HJKMNP-TV-Z]{16}$/
const STORAGE_KEY_RE =
  /^(invoice|cash_receipt|mileage)\/(inv|rcp|mil)_[0-9A-HJKMNP-TV-Z]{16}\/blob_[0-9A-HJKMNP-TV-Z]{16}$/

export function assertSafeSourceId(id: string): void {
  if (!SOURCE_ID_RE.test(id)) {
    throw new Error('Invalid source id.')
  }
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
