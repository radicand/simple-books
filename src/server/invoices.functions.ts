import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import {
  parseDollarsToCents,
  parseQuantityToMicro,
} from '~/lib/money'
import { todayISO, isoYear } from '~/lib/date'
import {
  nextInvoiceNumber,
  reverseInvoiceJournal,
  postInvoiceJournal,
  recalcInvoiceStatusSync,
} from '~/server/posting'

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

const updateSchema = createSchema.extend({
  id: z.string(),
  /** When set, used as invoice subtotal (must match payments on auto-created invoices). */
  subtotalOverride: z.string().optional(),
})

function parseInvoiceLines(lines: z.infer<typeof lineInputSchema>[]) {
  return lines.map((l, i) => {
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
}

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

    const linesParsed = parseInvoiceLines(data.lines)
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
      postInvoiceJournal(tx, {
        invoiceId: id,
        invoiceNumber: number,
        issuedOn: data.issuedOn,
        subtotalCents: subtotal,
      })
    })
    return { id, number }
  })

export const updateInvoice = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { invoices, invoiceLines, cashReceipts } = await import('~/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [inv] = await db.select().from(invoices).where(eq(invoices.id, data.id))
    if (!inv) throw new Error('Invoice not found.')
    if (inv.status === 'void') throw new Error('Cannot edit a void invoice.')

    const paidRow = (
      await db
        .select({ t: sql<number>`COALESCE(SUM(${cashReceipts.amountCents}),0)` })
        .from(cashReceipts)
        .where(eq(cashReceipts.invoiceId, data.id))
    )[0]
    const paidCents = Number(paidRow?.t ?? 0)
    const editTiedToPayment = inv.autoCreated && paidCents > 0

    if (!editTiedToPayment) {
      if (inv.status !== 'open') {
        throw new Error('Only open invoices can be edited. Delete payments first.')
      }
      if (paidCents > 0) {
        throw new Error('Cannot edit an invoice with payments. Delete the payments first.')
      }
    }

    const linesParsed = parseInvoiceLines(data.lines)
    const lineSubtotal = linesParsed.reduce((s, l) => s + l.amountCents, 0)
    let subtotal = lineSubtotal
    if (data.subtotalOverride?.trim()) {
      subtotal = parseDollarsToCents(data.subtotalOverride)
    }
    if (subtotal <= 0) throw new Error('Invoice total must be > 0.')

    if (editTiedToPayment) {
      if (data.customerId !== inv.customerId) {
        throw new Error('Customer cannot be changed on an auto-created invoice.')
      }
      if (subtotal !== paidCents) {
        throw new Error(
          'Invoice total must equal the payment amount. Adjust the total or line items.',
        )
      }
    }

    db.transaction((tx) => {
      reverseInvoiceJournal(tx, {
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        subtotalCents: inv.subtotalCents,
        date: inv.issuedOn,
      })
      tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, data.id)).run()
      for (const l of linesParsed) {
        tx.insert(invoiceLines).values({ ...l, invoiceId: data.id }).run()
      }
      tx.update(invoices)
        .set({
          customerId: data.customerId,
          issuedOn: data.issuedOn,
          dueOn: data.dueOn,
          memo: data.memo?.trim() || null,
          subtotalCents: subtotal,
        })
        .where(eq(invoices.id, data.id))
        .run()
      postInvoiceJournal(tx, {
        invoiceId: inv.id,
        invoiceNumber: inv.number,
        issuedOn: data.issuedOn,
        subtotalCents: subtotal,
      })
      if (editTiedToPayment) {
        recalcInvoiceStatusSync(tx, data.id)
      }
    })
    return { id: data.id, number: inv.number }
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

    const { deleteAttachmentsForSource } = await import('~/server/attachments.server')
    await deleteAttachmentsForSource('invoice', data.id)
    db.transaction((tx) => {
      const receiptCount = (
        tx
          .select({ c: sql<number>`COUNT(*)` })
          .from(cashReceipts)
          .where(eq(cashReceipts.invoiceId, data.id))
          .all() as Array<{ c: number }>
      )[0]
      if (Number(receiptCount?.c ?? 0) > 0) {
        throw new Error('Cannot void an invoice with payments. Delete the payments first.')
      }
      tx.update(invoices).set({ status: 'void' }).where(eq(invoices.id, data.id)).run()
      reverseInvoiceJournal(tx, {
        invoiceId: data.id,
        invoiceNumber: inv.number,
        subtotalCents: inv.subtotalCents,
        date: todayISO(),
      })
    })
    return { ok: true }
  })
