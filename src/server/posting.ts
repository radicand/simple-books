/**
 * Posting engine. Every business event becomes a balanced journal entry.
 * Pure (no DB connection, no auth) — caller passes in an open Drizzle tx.
 */
import { eq, like, max, sql } from 'drizzle-orm'
import type { DB } from '~/db/client'
import {
  journalEntries,
  journalLines,
  invoices,
  invoiceLines,
  cashReceipts,
} from '~/db/schema'
import { newId } from '~/lib/ids'

export type PostingLine = {
  accountCode: string
  debitCents?: number
  creditCents?: number
  memo?: string
}

/** Insert a balanced journal entry inside a Drizzle transaction. */
export async function postJournalSync(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
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
    throw new Error(`Unbalanced journal entry: debits=${debits} credits=${credits}`)
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
  for (let i = 0; i < args.lines.length; i++) {
    const l = args.lines[i]!
    await tx.insert(journalLines).values({
      id: newId('jl'),
      entryId,
      accountCode: l.accountCode,
      debitCents: l.debitCents ?? 0,
      creditCents: l.creditCents ?? 0,
      memo: l.memo ?? null,
      position: i,
    })
  }
  return entryId
}

export async function autoCreateInvoiceForPayment(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  args: {
    customerId: string
    date: string
    amountCents: number
    nextNumber: string
  },
): Promise<{ id: string; number: string }> {
  const id = newId('inv')
  await tx.insert(invoices).values({
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
  await tx.insert(invoiceLines).values({
    id: newId('iln'),
    invoiceId: id,
    serviceProductId: null,
    description: 'Services rendered',
    quantityMicro: 1_000_000,
    unitPriceCents: args.amountCents,
    amountCents: args.amountCents,
    position: 0,
  })
  await postJournalSync(tx, {
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

export async function reverseInvoiceJournal(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  args: { invoiceId: string; invoiceNumber: string; subtotalCents: number; date: string },
) {
  await postJournalSync(tx, {
    date: args.date,
    memo: `Reverse invoice ${args.invoiceNumber}`,
    source: 'reversal',
    sourceId: args.invoiceId,
    lines: [
      { accountCode: ACCT.SERVICES_REVENUE, debitCents: args.subtotalCents },
      { accountCode: ACCT.AR, creditCents: args.subtotalCents },
    ],
  })
}

export async function postInvoiceJournal(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  args: { invoiceId: string; invoiceNumber: string; issuedOn: string; subtotalCents: number },
) {
  await postJournalSync(tx, {
    date: args.issuedOn,
    memo: `Invoice ${args.invoiceNumber}`,
    source: 'invoice',
    sourceId: args.invoiceId,
    lines: [
      { accountCode: ACCT.AR, debitCents: args.subtotalCents },
      { accountCode: ACCT.SERVICES_REVENUE, creditCents: args.subtotalCents },
    ],
  })
}

export async function cascadeAutoInvoiceAmount(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  args: {
    invoiceId: string
    invoiceNumber: string
    oldSubtotalCents: number
    issuedOn: string
    newSubtotalCents: number
  },
) {
  await reverseInvoiceJournal(tx, {
    invoiceId: args.invoiceId,
    invoiceNumber: args.invoiceNumber,
    subtotalCents: args.oldSubtotalCents,
    date: args.issuedOn,
  })
  await tx
    .update(invoices)
    .set({
      subtotalCents: args.newSubtotalCents,
      issuedOn: args.issuedOn,
      dueOn: args.issuedOn,
    })
    .where(eq(invoices.id, args.invoiceId))
  await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, args.invoiceId))
  await tx.insert(invoiceLines).values({
    id: newId('iln'),
    invoiceId: args.invoiceId,
    serviceProductId: null,
    description: 'Services rendered',
    quantityMicro: 1_000_000,
    unitPriceCents: args.newSubtotalCents,
    amountCents: args.newSubtotalCents,
    position: 0,
  })
  await postInvoiceJournal(tx, {
    invoiceId: args.invoiceId,
    invoiceNumber: args.invoiceNumber,
    issuedOn: args.issuedOn,
    subtotalCents: args.newSubtotalCents,
  })
}

export async function recalcInvoiceStatusSync(
  tx: Parameters<Parameters<DB['transaction']>[0]>[0],
  invoiceId: string,
) {
  const [inv] = await tx
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
  if (!inv || inv.status === 'void') return
  const [paid] = await tx
    .select({
      t: sql<number>`COALESCE(SUM(${cashReceipts.amountCents}),0)`,
    })
    .from(cashReceipts)
    .where(eq(cashReceipts.invoiceId, invoiceId))
  const totalPaid = Number(paid?.t ?? 0)
  const status = totalPaid >= inv.subtotalCents ? 'paid' : 'open'
  await tx.update(invoices).set({ status }).where(eq(invoices.id, invoiceId))
}

export async function nextInvoiceNumber(db: DB, year: number): Promise<string> {
  const [row] = await db
    .select({ n: max(invoices.number) })
    .from(invoices)
    .where(like(invoices.number, `${year}-%`))
  const last = row?.n ? Number(String(row.n).split('-')[1]) : 0
  return `${year}-${String((last || 0) + 1).padStart(4, '0')}`
}

export const ACCT = {
  CASH: '1000',
  AR: '1100',
  OWNERS_EQUITY: '3000',
  OWNERS_CONTRIBUTION: '3010',
  OWNERS_DRAW: '3020',
  SERVICES_REVENUE: '4000',
  VEHICLE_EXPENSE: '6100',
} as const
