/**
 * Posting engine. Every business event becomes a balanced journal entry.
 * Use within a transaction. Pure (no auth, no db transaction itself) — the
 * caller wires up tx.
 */
import { eq } from 'drizzle-orm'
import { journalEntries, journalLines } from '~/db/schema'
import { newId } from '~/lib/ids'

export type PostingLine = {
  accountCode: string
  debitCents?: number
  creditCents?: number
  memo?: string
}

export type DBTx = {
  insert: (...args: any[]) => any
  update: (...args: any[]) => any
  delete: (...args: any[]) => any
  select: (...args: any[]) => any
}

export async function postJournal(
  tx: DBTx,
  args: {
    date: string
    memo: string
    source: 'invoice' | 'cash_receipt' | 'mileage' | 'manual' | 'reversal'
    sourceId?: string
    lines: PostingLine[]
  },
): Promise<string> {
  const debits = args.lines.reduce((s, l) => s + (l.debitCents ?? 0), 0)
  const credits = args.lines.reduce((s, l) => s + (l.creditCents ?? 0), 0)
  if (debits !== credits) {
    throw new Error(
      `Unbalanced journal entry: debits=${debits} credits=${credits}`,
    )
  }
  if (debits === 0) throw new Error('Journal entry has zero amount.')

  const entryId = newId('je')
  await tx.insert(journalEntries).values({
    id: entryId,
    date: args.date,
    memo: args.memo,
    source: args.source,
    sourceId: args.sourceId ?? null,
  })
  await tx.insert(journalLines).values(
    args.lines.map((l, i) => ({
      id: newId('jl'),
      entryId,
      accountCode: l.accountCode,
      debitCents: l.debitCents ?? 0,
      creditCents: l.creditCents ?? 0,
      memo: l.memo ?? null,
      position: i,
    })),
  )
  return entryId
}

/**
 * Reverse a journal entry: insert a sibling entry that swaps debits/credits.
 * Cross-links both entries via reversed_by_id.
 */
export async function reverseJournal(
  tx: DBTx,
  args: { originalId: string; date: string; memo: string },
): Promise<string> {
  const orig = (await tx
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, args.originalId))) as any[]
  if (!orig.length) throw new Error('Original journal entry not found.')
  if (orig[0].reversedById) throw new Error('Journal entry already reversed.')

  const origLines = (await tx
    .select()
    .from(journalLines)
    .where(eq(journalLines.entryId, args.originalId))) as any[]

  const reversalId = newId('je')
  await tx.insert(journalEntries).values({
    id: reversalId,
    date: args.date,
    memo: args.memo,
    source: 'reversal',
    sourceId: args.originalId,
  })
  await tx.insert(journalLines).values(
    origLines.map((l: any, i: number) => ({
      id: newId('jl'),
      entryId: reversalId,
      accountCode: l.accountCode,
      debitCents: l.creditCents,
      creditCents: l.debitCents,
      memo: `Reversal of ${args.originalId}`,
      position: i,
    })),
  )
  await tx
    .update(journalEntries)
    .set({ reversedById: reversalId })
    .where(eq(journalEntries.id, args.originalId))
  return reversalId
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
