import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { newId } from '~/lib/ids'
import { parseDollarsToCents } from '~/lib/money'
import { isoYear } from '~/lib/date'
import {
  postJournalSync,
  autoCreateInvoiceForPayment,
  nextInvoiceNumber,
  cascadeAutoInvoiceAmount,
  recalcInvoiceStatusSync,
  ACCT,
} from '~/server/posting'

const createSchema = z.object({
  customerId: z.string(),
  invoiceId: z.string().optional().nullable(),
  receivedOn: z.string(),
  amount: z.string().min(1),
  method: z.enum(['cash', 'check', 'card', 'transfer', 'other']),
  memo: z.string().max(500).optional().nullable(),
})

const updateSchema = createSchema.extend({ id: z.string() })

export const listReceipts = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware]).handler(async () => {
  // auth enforced by requireAuthMiddleware
  const { db } = await import('~/db/client')
  const { cashReceipts, customers, invoices } = await import('~/db/schema')
  const { eq, desc } = await import('drizzle-orm')
  return db
    .select({
      id: cashReceipts.id,
      receivedOn: cashReceipts.receivedOn,
      customerId: cashReceipts.customerId,
      customerName: customers.name,
      invoiceId: cashReceipts.invoiceId,
      invoiceNumber: invoices.number,
      amountCents: cashReceipts.amountCents,
      method: cashReceipts.method,
      memo: cashReceipts.memo,
    })
    .from(cashReceipts)
    .leftJoin(customers, eq(cashReceipts.customerId, customers.id))
    .leftJoin(invoices, eq(cashReceipts.invoiceId, invoices.id))
    .orderBy(desc(cashReceipts.receivedOn), desc(cashReceipts.createdAt))
})

export const getReceipt = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { cashReceipts, customers, invoices } = await import('~/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .select({
        id: cashReceipts.id,
        receivedOn: cashReceipts.receivedOn,
        customerId: cashReceipts.customerId,
        customerName: customers.name,
        invoiceId: cashReceipts.invoiceId,
        invoiceNumber: invoices.number,
        invoiceStatus: invoices.status,
        invoiceAutoCreated: invoices.autoCreated,
        amountCents: cashReceipts.amountCents,
        method: cashReceipts.method,
        memo: cashReceipts.memo,
      })
      .from(cashReceipts)
      .leftJoin(customers, eq(cashReceipts.customerId, customers.id))
      .leftJoin(invoices, eq(cashReceipts.invoiceId, invoices.id))
      .where(eq(cashReceipts.id, data.id))
    if (!row) throw new Error('Receipt not found.')
    return row
  })

export const openInvoicesForCustomer = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z
      .object({
        customerId: z.string(),
        includeInvoiceId: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { cashReceipts, invoices } = await import('~/db/schema')
    const { eq, sql, desc } = await import('drizzle-orm')
    const rows = await db
      .select({
        id: invoices.id,
        number: invoices.number,
        issuedOn: invoices.issuedOn,
        dueOn: invoices.dueOn,
        subtotalCents: invoices.subtotalCents,
        paidCents: sql<number>`COALESCE(SUM(${cashReceipts.amountCents}), 0)`.as('paid'),
      })
      .from(invoices)
      .leftJoin(cashReceipts, eq(cashReceipts.invoiceId, invoices.id))
      .where(eq(invoices.customerId, data.customerId))
      .groupBy(invoices.id)
      .orderBy(desc(invoices.issuedOn))
    const mapped = rows.map((r) => ({
      ...r,
      balanceCents: r.subtotalCents - Number(r.paidCents ?? 0),
    }))
    const open = mapped.filter((r) => r.balanceCents > 0)
    if (!data.includeInvoiceId) return open
    const current = mapped.find((r) => r.id === data.includeInvoiceId)
    if (!current || open.some((r) => r.id === current.id)) return open
    return [current, ...open]
  })

export const createReceipt = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db, sqlite } = await import('~/db/client')
    const { cashReceipts, invoices } = await import('~/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const amountCents = parseDollarsToCents(data.amount)
    if (amountCents <= 0) throw new Error('Amount must be > 0.')

    let createdInvoice: { id: string; number: string } | null = null
    const receiptId = newId('rcp')

    // Compute next invoice number outside tx (if needed)
    const number = nextInvoiceNumber(sqlite, isoYear(data.receivedOn))

    db.transaction((tx) => {
      let invoiceId = data.invoiceId || null
      if (!invoiceId) {
        const made = autoCreateInvoiceForPayment(tx, {
          customerId: data.customerId,
          date: data.receivedOn,
          amountCents,
          nextNumber: number,
        })
        invoiceId = made.id
        createdInvoice = made
      } else {
        const [inv] = tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .all() as any[]
        if (!inv) throw new Error('Invoice not found.')
        if (inv.customerId !== data.customerId)
          throw new Error('Invoice belongs to a different customer.')
        if (inv.status === 'void') throw new Error('Invoice is voided.')
        const paidBefore = (
          tx
            .select({
              t: sql<number>`COALESCE(SUM(${cashReceipts.amountCents}),0)`,
            })
            .from(cashReceipts)
            .where(eq(cashReceipts.invoiceId, invoiceId!))
            .all() as any[]
        )[0]?.t as number
        const balanceDue = inv.subtotalCents - Number(paidBefore ?? 0)
        if (balanceDue <= 0) throw new Error('Invoice has no balance due.')
        if (amountCents > balanceDue)
          throw new Error('Payment exceeds invoice balance.')
      }

      tx.insert(cashReceipts)
        .values({
          id: receiptId,
          receivedOn: data.receivedOn,
          customerId: data.customerId,
          invoiceId: invoiceId!,
          amountCents,
          method: data.method,
          memo: data.memo?.trim() || null,
        })
        .run()

      postJournalSync(tx, {
        date: data.receivedOn,
        memo: `Payment received${createdInvoice ? ` (auto inv ${(createdInvoice as { number: string }).number})` : ''}`,
        source: 'cash_receipt',
        sourceId: receiptId,
        lines: [
          { accountCode: ACCT.CASH, debitCents: amountCents },
          { accountCode: ACCT.AR, creditCents: amountCents },
        ],
      })

      recalcInvoiceStatusSync(tx, invoiceId!)
    })

    return { id: receiptId, autoInvoice: createdInvoice }
  })

export const updateReceipt = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const { db } = await import('~/db/client')
    const { cashReceipts, invoices } = await import('~/db/schema')
    const { eq, sql, and, ne } = await import('drizzle-orm')

    const [r] = await db.select().from(cashReceipts).where(eq(cashReceipts.id, data.id))
    if (!r) throw new Error('Receipt not found.')

    const [currentInv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, r.invoiceId))
    if (!currentInv) throw new Error('Invoice not found.')
    if (currentInv.status === 'void') throw new Error('Cannot edit a payment on a void invoice.')

    const amountCents = parseDollarsToCents(data.amount)
    if (amountCents <= 0) throw new Error('Amount must be > 0.')

    const targetInvoiceId = data.invoiceId || r.invoiceId
    if (!targetInvoiceId) throw new Error('Invoice is required.')

    if (currentInv.autoCreated && targetInvoiceId !== r.invoiceId) {
      throw new Error('Cannot reassign a payment linked to an auto-created invoice.')
    }

    const receiptCountOnCurrent = (
      await db
        .select({ c: sql<number>`COUNT(*)` })
        .from(cashReceipts)
        .where(eq(cashReceipts.invoiceId, r.invoiceId))
    )[0]
    const shouldCascade =
      currentInv.autoCreated && Number(receiptCountOnCurrent?.c ?? 0) === 1

    db.transaction((tx) => {
      postJournalSync(tx, {
        date: r.receivedOn,
        memo: `Reverse payment ${r.id}`,
        source: 'reversal',
        sourceId: r.id,
        lines: [
          { accountCode: ACCT.AR, debitCents: r.amountCents },
          { accountCode: ACCT.CASH, creditCents: r.amountCents },
        ],
      })

      if (shouldCascade) {
        cascadeAutoInvoiceAmount(tx, {
          invoiceId: currentInv.id,
          invoiceNumber: currentInv.number,
          oldSubtotalCents: currentInv.subtotalCents,
          issuedOn: data.receivedOn,
          newSubtotalCents: amountCents,
        })
      } else {
        const [targetInv] = tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, targetInvoiceId))
          .all() as Array<{
          id: string
          customerId: string
          status: string
          subtotalCents: number
        }>
        if (!targetInv) throw new Error('Invoice not found.')
        if (targetInv.customerId !== data.customerId) {
          throw new Error('Invoice belongs to a different customer.')
        }
        if (targetInv.status === 'void') throw new Error('Invoice is voided.')

        const paidOthers = (
          tx
            .select({
              t: sql<number>`COALESCE(SUM(${cashReceipts.amountCents}),0)`,
            })
            .from(cashReceipts)
            .where(
              and(
                eq(cashReceipts.invoiceId, targetInvoiceId),
                ne(cashReceipts.id, data.id),
              ),
            )
            .all() as Array<{ t: number }>
        )[0]?.t as number
        const balanceDue = targetInv.subtotalCents - Number(paidOthers ?? 0)
        if (balanceDue <= 0 && targetInvoiceId !== r.invoiceId) {
          throw new Error('Invoice has no balance due.')
        }
        if (amountCents > balanceDue) {
          throw new Error('Payment exceeds invoice balance.')
        }
      }

      tx.update(cashReceipts)
        .set({
          receivedOn: data.receivedOn,
          customerId: data.customerId,
          invoiceId: targetInvoiceId,
          amountCents,
          method: data.method,
          memo: data.memo?.trim() || null,
        })
        .where(eq(cashReceipts.id, data.id))
        .run()

      postJournalSync(tx, {
        date: data.receivedOn,
        memo: `Payment received`,
        source: 'cash_receipt',
        sourceId: data.id,
        lines: [
          { accountCode: ACCT.CASH, debitCents: amountCents },
          { accountCode: ACCT.AR, creditCents: amountCents },
        ],
      })

      recalcInvoiceStatusSync(tx, r.invoiceId)
      if (targetInvoiceId !== r.invoiceId) {
        recalcInvoiceStatusSync(tx, targetInvoiceId)
      }
    })

    return { id: data.id }
  })

export const deleteReceipt = createServerFn({ method: 'POST' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { cashReceipts, invoices } = await import('~/db/schema')
    const { eq, sql } = await import('drizzle-orm')

    const [r] = await db
      .select()
      .from(cashReceipts)
      .where(eq(cashReceipts.id, data.id))
    if (!r) throw new Error('Receipt not found.')

    const { deleteAttachmentsForSource } = await import('~/server/attachments.server')
    await deleteAttachmentsForSource('cash_receipt', data.id)

    db.transaction((tx) => {
      postJournalSync(tx, {
        date: r.receivedOn,
        memo: `Reverse payment ${r.id}`,
        source: 'reversal',
        sourceId: r.id,
        lines: [
          { accountCode: ACCT.AR, debitCents: r.amountCents },
          { accountCode: ACCT.CASH, creditCents: r.amountCents },
        ],
      })
      tx.delete(cashReceipts).where(eq(cashReceipts.id, data.id)).run()
      recalcInvoiceStatusSync(tx, r.invoiceId)
    })
    return { ok: true }
  })
