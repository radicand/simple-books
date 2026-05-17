// Compact, URL-safe ids. Crockford base32 of 80 bits.
const ALPH = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function newId(prefix?: string): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += ALPH[(value >> bits) & 31]
    }
  }
  return prefix ? `${prefix}_${out}` : out
}
