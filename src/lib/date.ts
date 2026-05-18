// ISO date helpers. We store dates as YYYY-MM-DD strings to avoid TZ pain.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function referenceDateISO(): string | undefined {
  if (typeof process !== 'undefined' && process.env.REFERENCE_DATE) {
    const d = process.env.REFERENCE_DATE
    if (ISO_DATE.test(d)) return d
  }
  if (typeof __REFERENCE_DATE__ !== 'undefined' && __REFERENCE_DATE__) {
    if (ISO_DATE.test(__REFERENCE_DATE__)) return __REFERENCE_DATE__
  }
  return undefined
}

export function todayISO(): string {
  const ref = referenceDateISO()
  if (ref) return ref
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Stable clock for UI that keys off time-of-day (e.g. dashboard greeting during e2e). */
export function referenceNow(): Date {
  const ref = referenceDateISO()
  if (ref) {
    const [y, m, d] = ref.split('-').map(Number)
    return new Date(Date.UTC(y!, m! - 1, d!, 17, 0, 0))
  }
  return new Date()
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export function fmtDateLong(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dt)
}

export function isoYear(iso: string): number {
  return Number(iso.slice(0, 4))
}
