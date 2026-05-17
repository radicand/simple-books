/** rate_micro_per_mile = cents_per_mile × 10_000 (supports half-cent IRS rates). */

export function centsPerMileToMicro(cents: number): number {
  return Math.round(cents * 10_000)
}

export function microPerMileToCents(micro: number): number {
  return micro / 10_000
}

export function formatCentsPerMile(cents: number): string {
  const fixed = cents.toFixed(2)
  return fixed.replace(/\.?0+$/, '') || '0'
}

export function taxYearFromDate(isoDate: string): number {
  const y = isoDate.slice(0, 4)
  const n = Number(y)
  if (!Number.isFinite(n) || n < 1900) throw new Error('Invalid trip date.')
  return n
}
