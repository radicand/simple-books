import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import {
  parseDollarsToCents,
  parseQuantityToMicro,
} from '~/lib/money'
import { todayISO, isoYear } from '~/lib/date'
import { ACCT, postJournalSync, nextInvoiceNumber } from '~/server/posting'

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

export const listInvoices = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware]).handler(async () => {
  // auth enforced by requireAuthMiddleware
  const { db } = await import('~/db/client')
  const { invoices, customers, cashReceipts } = await import('~/db/schema')
  const { eq, desc, sql } = await import('drizzle-orm')

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

export const getInvoice = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { invoices, invoiceLines, customers, cashReceipts } = await import('~/db/schema')
    const { eq, asc, desc } = await import('drizzle-orm')
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

export const createInvoice = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db, sqlite } = await import('~/db/client')
    const { invoices, invoiceLines } = await import('~/db/schema')

    const linesParsed = data.lines.map((l, i) => {
      const qtyMicro = parseQuantityToMicro(l.quantity)
      const unitPriceCents = parseDollarsToCents(l.unitPrice)
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
    const number = nextInvoiceNumber(sqlite, year)
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

export const voidInvoice = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { invoices, cashReceipts } = await import('~/db/schema')
    const { eq, sql } = await import('drizzle-orm')

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
