/** IRS 2026 rate from scripts/seed.ts (72.5¢/mi). */
export const IRS_2026_MICRO_PER_MILE = 725_000

export function centsPerMileFromMicro(micro: number): number {
  return micro / 10_000
}

export function mileageReimbursementCents(
  miles: number,
  centsPerMile = centsPerMileFromMicro(IRS_2026_MICRO_PER_MILE),
): number {
  const milesMicro = miles * 1_000_000
  return Math.round((milesMicro * centsPerMile) / 1_000_000)
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function expectedCashCents(opts: {
  invoicePaymentCents: number
  standalonePaymentCents: number
}): number {
  return opts.invoicePaymentCents + opts.standalonePaymentCents
}
