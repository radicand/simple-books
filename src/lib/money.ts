// All money helpers operate on integer cents. Never parseFloat user input.

const FMT_USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const FMT_USD_NO_CENTS = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function fmtCents(cents: number, opts?: { compact?: boolean }): string {
  const value = (cents ?? 0) / 100
  if (opts?.compact && Number.isInteger(value)) return FMT_USD_NO_CENTS.format(value)
  return FMT_USD.format(value)
}

export function parseDollarsToCents(input: string): number {
  if (input == null) return 0
  const s = String(input).replace(/[$,_\s]/g, '').trim()
  if (s === '' || s === '-') return 0
  if (!/^-?\d+(\.\d{0,2})?$/.test(s)) {
    throw new Error('Invalid amount; use dollars and up to 2 decimals.')
  }
  const [whole, frac = ''] = s.split('.')
  const sign = whole!.startsWith('-') ? -1 : 1
  const wholeAbs = whole!.replace('-', '')
  const cents =
    Number(wholeAbs) * 100 + Number((frac + '00').slice(0, 2) || '0')
  return sign * cents
}

export const MICRO = 1_000_000

export function parseQuantityToMicro(input: string): number {
  if (input == null) return 0
  const s = String(input).trim()
  if (s === '') return 0
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error('Invalid quantity.')
  const n = Number(s)
  return Math.round(n * MICRO)
}

export function microToDecimal(micro: number, places = 2): string {
  const sign = micro < 0 ? '-' : ''
  const abs = Math.abs(micro)
  const whole = Math.floor(abs / MICRO)
  const frac = abs % MICRO
  const fracStr = String(frac).padStart(6, '0').slice(0, places).replace(/0+$/, '')
  return fracStr ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`
}

// Multiply two micros (qty × rate) → cents, with banker rounding to cents.
export function microTimesMicroToCents(a: number, b: number): number {
  // a × b is in micro² (1e12). To cents we divide by 1e10.
  const product = BigInt(a) * BigInt(b)
  const divisor = 10_000_000_000n
  const half = divisor / 2n
  const rounded = product >= 0n ? (product + half) / divisor : -((-product + half) / divisor)
  return Number(rounded)
}
