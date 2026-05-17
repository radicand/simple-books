/**
 * Posting engine. Every business event becomes a balanced journal entry.
 * Pure (no DB connection, no auth) — caller passes in an open Drizzle tx.
 * Importing this module is client-safe; the work only runs server-side
 * because the tx itself can only be obtained server-side.
 */
import { journalEntries, journalLines, invoices, invoiceLines } from '~/db/schema'
import { newId } from '~/lib/ids'

export type PostingLine = {
  accountCode: string
  debitCents?: number
  creditCents?: number
  memo?: string
}

/**
 * Insert a balanced journal entry inside a Drizzle bun-sqlite transaction.
 * The tx callback in bun-sqlite is synchronous, so this helper is sync too.
 */
export function postJournalSync(
  tx: any,
  args: {
    date: string
    memo: string
    source: 'invoice' | 'cash_receipt' | 'mileage' | 'manual' | 'reversal'
    sourceId?: string
    lines: PostingLine[]
  },
): string {
  const debits = args.lines.reduce((s, l) => s + (l.debitCents ?? 0), 0)
  const credits = args.lines.reduce((s, l) => s + (l.creditCents ?? 0), 0)
  if (debits !== credits) {
    throw new Error(`Unbalanced journal entry: debits=${debits} credits=${credits}`)
  }
  if (debits === 0) throw new Error('Journal entry has zero amount.')

  const entryId = newId('je')
  tx.insert(journalEntries)
    .values({
      id: entryId,
      date: args.date,
      memo: args.memo,
      source: args.source,
      sourceId: args.sourceId ?? null,
    })
    .run()
  for (let i = 0; i < args.lines.length; i++) {
    const l = args.lines[i]!
    tx.insert(journalLines)
      .values({
        id: newId('jl'),
        entryId,
        accountCode: l.accountCode,
        debitCents: l.debitCents ?? 0,
        creditCents: l.creditCents ?? 0,
        memo: l.memo ?? null,
        position: i,
      })
      .run()
  }
  return entryId
}

/**
 * Insert an auto-created invoice for a stand-alone cash receipt and post
 * its journal entry. Returns { id, number }. Caller computes the next
 * number (since that needs the sqlite query helper).
 */
export function autoCreateInvoiceForPayment(
  tx: any,
  args: {
    customerId: string
    date: string
    amountCents: number
    nextNumber: string
  },
): { id: string; number: string } {
  const id = newId('inv')
  tx.insert(invoices)
    .values({
      id,
      number: args.nextNumber,
      customerId: args.customerId,
      issuedOn: args.date,
      dueOn: args.date,
      status: 'open',
      memo: 'Auto-created from payment',
      subtotalCents: args.amountCents,
      autoCreated: true,
    })
    .run()
  tx.insert(invoiceLines)
    .values({
      id: newId('iln'),
      invoiceId: id,
      serviceProductId: null,
      description: 'Services rendered',
      quantityMicro: 1_000_000,
      unitPriceCents: args.amountCents,
      amountCents: args.amountCents,
      position: 0,
    })
    .run()
  postJournalSync(tx, {
    date: args.date,
    memo: `Invoice ${args.nextNumber} (auto-created)`,
    source: 'invoice',
    sourceId: id,
    lines: [
      { accountCode: ACCT.AR, debitCents: args.amountCents },
      { accountCode: ACCT.SERVICES_REVENUE, creditCents: args.amountCents },
    ],
  })
  return { id, number: args.nextNumber }
}

/** Generate the next invoice number for a year, given a sqlite handle. */
export function nextInvoiceNumber(sqlite: any, year: number): string {
  const row = sqlite
    .query<{ n: string | null }, [string]>(
      `SELECT MAX(number) AS n FROM invoices WHERE number LIKE ?`,
    )
    .get(`${year}-%`)
  const last = row?.n ? Number(String(row.n).split('-')[1]) : 0
  return `${year}-${String((last || 0) + 1).padStart(4, '0')}`
}

// ---- Canonical account codes (must match the seed) ----
export const ACCT = {
  CASH: '1000',
  AR: '1100',
  OWNERS_EQUITY: '3000',
  OWNERS_CONTRIBUTION: '3010',
  OWNERS_DRAW: '3020',
  SERVICES_REVENUE: '4000',
  VEHICLE_EXPENSE: '6100',
} as const
