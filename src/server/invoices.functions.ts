import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, sqlite } from '~/db/client.server'
import {
  invoices,
  invoiceLines,
  customers,
  serviceProducts,
  cashReceipts,
} from '~/db/schema'
import { ensureSession } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import {
  parseDollarsToCents,
  parseQuantityToMicro,
} from '~/lib/money'
import { todayISO, isoYear } from '~/lib/date'
import { postJournal, ACCT } from '~/server/posting.server'

const lineInputSchema = z.object({
  serviceProductId: z.string().nullable().optional(),
  description: z.string().min(1).max(500),
  quantity: z.string().min(1),
  unitPrice: z.string().min(1),
})

const createSchema = z.object({
  customerId: z.string(),
  issuedOn: z.string(),
  dueOn: z.string(),
  memo: z.string().max(500).optional().nullable(),
  lines: z.array(lineInputSchema).min(1),
})

/** Generate the next invoice number for the issued-year. e.g. 2026-0007. */
export function nextInvoiceNumber(year: number): string {
  const row = sqlite
    .query<{ n: string | null }, [string]>(
      `SELECT MAX(number) AS n FROM invoices WHERE number LIKE ?`,
    )
    .get(`${year}-%`)
  const last = row?.n ? Number(row.n.split('-')[1]) : 0
  const next = (last || 0) + 1
  return `${year}-${String(next).padStart(4, '0')}`
}

export const listInvoices = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSession()
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      customerId: invoices.customerId,
      customerName: customers.name,
      issuedOn: invoices.issuedOn,
      dueOn: invoices.dueOn,
      status: invoices.status,
      subtotalCents: invoices.subtotalCents,
      autoCreated: invoices.autoCreated,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.issuedOn), desc(invoices.number))

  // Compute paid totals in one query.
  const paid = await db
    .select({
      invoiceId: cashReceipts.invoiceId,
      total: sql<number>`SUM(${cashReceipts.amountCents})`.as('total'),
    })
    .from(cashReceipts)
    .groupBy(cashReceipts.invoiceId)
  const paidMap = new Map(paid.map((p) => [p.invoiceId, Number(p.total)]))

  return rows.map((r) => ({
    ...r,
    paidCents: paidMap.get(r.id) ?? 0,
    balanceCents: r.subtotalCents - (paidMap.get(r.id) ?? 0),
  }))
})

export const getInvoice = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const [inv] = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        customerId: invoices.customerId,
        customerName: customers.name,
        issuedOn: invoices.issuedOn,
        dueOn: invoices.dueOn,
        status: invoices.status,
        memo: invoices.memo,
        subtotalCents: invoices.subtotalCents,
        autoCreated: invoices.autoCreated,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, data.id))
    if (!inv) throw new Error('Invoice not found.')
    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, data.id))
      .orderBy(asc(invoiceLines.position))
    const receipts = await db
      .select()
      .from(cashReceipts)
      .where(eq(cashReceipts.invoiceId, data.id))
      .orderBy(desc(cashReceipts.receivedOn))
    const paidCents = receipts.reduce((s, r) => s + r.amountCents, 0)
    return {
      ...inv,
      lines,
      receipts,
      paidCents,
      balanceCents: inv.subtotalCents - paidCents,
    }
  })

export const createInvoice = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const linesParsed = data.lines.map((l, i) => {
      const qtyMicro = parseQuantityToMicro(l.quantity)
      const unitPriceCents = parseDollarsToCents(l.unitPrice)
      // amount = qty (decimal) × unit price (cents) → cents
      // qtyMicro × unitPriceCents / 1e6 with half-up rounding
      const product = BigInt(qtyMicro) * BigInt(unitPriceCents)
      const half = 500_000n
      const rounded =
        product >= 0n
          ? (product + half) / 1_000_000n
          : -((-product + half) / 1_000_000n)
      const amountCents = Number(rounded)
      return {
        id: newId('iln'),
        serviceProductId: l.serviceProductId || null,
        description: l.description.trim(),
        quantityMicro: qtyMicro,
        unitPriceCents,
        amountCents,
        position: i,
      }
    })
    const subtotal = linesParsed.reduce((s, l) => s + l.amountCents, 0)
    if (subtotal <= 0) throw new Error('Invoice total must be > 0.')

    const year = isoYear(data.issuedOn)
    const number = nextInvoiceNumber(year)
    const id = newId('inv')

    db.transaction((tx) => {
      tx.insert(invoices)
        .values({
          id,
          number,
          customerId: data.customerId,
          issuedOn: data.issuedOn,
          dueOn: data.dueOn,
          status: 'open',
          memo: data.memo?.trim() || null,
          subtotalCents: subtotal,
        })
        .run()
      for (const l of linesParsed) {
        tx.insert(invoiceLines).values({ ...l, invoiceId: id }).run()
      }
      // Post: DR A/R, CR Services Revenue
      postJournalSync(tx, {
        date: data.issuedOn,
        memo: `Invoice ${number}`,
        source: 'invoice',
        sourceId: id,
        lines: [
          { accountCode: ACCT.AR, debitCents: subtotal },
          { accountCode: ACCT.SERVICES_REVENUE, creditCents: subtotal },
        ],
      })
    })
    return { id, number }
  })

export const voidInvoice = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await ensureSession()
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, data.id))
    if (!inv) throw new Error('Invoice not found.')
    if (inv.status === 'void') return { ok: true }
    const receiptCount = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(cashReceipts)
      .where(eq(cashReceipts.invoiceId, data.id))
    if (Number(receiptCount[0]?.c ?? 0) > 0) {
      throw new Error('Cannot void an invoice with payments. Delete the payments first.')
    }
    db.transaction((tx) => {
      tx.update(invoices).set({ status: 'void' }).where(eq(invoices.id, data.id)).run()
      postJournalSync(tx, {
        date: todayISO(),
        memo: `Void invoice ${inv.number}`,
        source: 'reversal',
        sourceId: data.id,
        lines: [
          { accountCode: ACCT.SERVICES_REVENUE, debitCents: inv.subtotalCents },
          { accountCode: ACCT.AR, creditCents: inv.subtotalCents },
        ],
      })
    })
    return { ok: true }
  })

// Sync wrapper because better-sqlite3-style tx is sync; drizzle bun-sqlite tx
// callbacks are sync too. We need a sync version of postJournal.
import { journalEntries, journalLines } from '~/db/schema'
function postJournalSync(
  tx: any,
  args: {
    date: string
    memo: string
    source: 'invoice' | 'cash_receipt' | 'mileage' | 'manual' | 'reversal'
    sourceId?: string
    lines: Array<{
      accountCode: string
      debitCents?: number
      creditCents?: number
      memo?: string
    }>
  },
) {
  const debits = args.lines.reduce((s, l) => s + (l.debitCents ?? 0), 0)
  const credits = args.lines.reduce((s, l) => s + (l.creditCents ?? 0), 0)
  if (debits !== credits) throw new Error(`Unbalanced: ${debits} vs ${credits}`)
  if (debits === 0) throw new Error('Zero-amount journal entry.')
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

// Helper used by receipts.functions.ts to create an auto-invoice for a
// stand-alone payment. Returns the new invoice id + number; runs inside the
// caller's transaction (sync).
export function autoCreateInvoiceForPayment(
  tx: any,
  args: { customerId: string; date: string; amountCents: number },
): { id: string; number: string } {
  const year = isoYear(args.date)
  const number = nextInvoiceNumber(year)
  const id = newId('inv')
  tx.insert(invoices)
    .values({
      id,
      number,
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
    memo: `Invoice ${number} (auto-created)`,
    source: 'invoice',
    sourceId: id,
    lines: [
      { accountCode: ACCT.AR, debitCents: args.amountCents },
      { accountCode: ACCT.SERVICES_REVENUE, creditCents: args.amountCents },
    ],
  })
  return { id, number }
}

export { postJournalSync }
