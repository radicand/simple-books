import { createServerFn } from '@tanstack/react-start'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { ACCT } from '~/server/posting'
import { todayISO } from '~/lib/date'

export const getDashboard = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware]).handler(async () => {
  // auth enforced by requireAuthMiddleware
  const { db } = await import('~/db/client')
  const {
    cashReceipts,
    customers,
    invoices,
    journalLines,
    journalEntries,
    chartAccounts,
  } = await import('~/db/schema')
  const { and, desc, eq, gte, sql, inArray } = await import('drizzle-orm')

  const today = todayISO()
  const yearStart = `${today.slice(0, 4)}-01-01`

  const balanceFor = async (codes: string[], opts?: { gte?: string }) => {
    const rows = await db
      .select({
        sumDr: sql<number>`COALESCE(SUM(${journalLines.debitCents}),0)`,
        sumCr: sql<number>`COALESCE(SUM(${journalLines.creditCents}),0)`,
        normal: chartAccounts.normal,
        type: chartAccounts.type,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .innerJoin(chartAccounts, eq(journalLines.accountCode, chartAccounts.code))
      .where(
        and(
          inArray(journalLines.accountCode, codes),
          opts?.gte ? gte(journalEntries.date, opts.gte) : undefined,
        ),
      )
      .groupBy(chartAccounts.normal, chartAccounts.type)
    if (!rows.length) return 0
    const r = rows[0]!
    return r.normal === 'debit'
      ? Number(r.sumDr) - Number(r.sumCr)
      : Number(r.sumCr) - Number(r.sumDr)
  }

  const [cashCents, arCents, revenueYtdCents, expensesYtdCents] = await Promise.all([
    balanceFor([ACCT.CASH]),
    balanceFor([ACCT.AR]),
    balanceFor([ACCT.SERVICES_REVENUE], { gte: yearStart }),
    balanceFor([ACCT.VEHICLE_EXPENSE], { gte: yearStart }),
  ])

  const openInvoicesRaw = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      customerName: customers.name,
      dueOn: invoices.dueOn,
      subtotalCents: invoices.subtotalCents,
      paid: sql<number>`COALESCE((SELECT SUM(${cashReceipts.amountCents}) FROM cash_receipts WHERE cash_receipts.invoice_id = ${invoices.id}),0)`,
    })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.status, 'open'))
    .orderBy(desc(invoices.dueOn))
    .limit(5)

  const openInvoices = openInvoicesRaw.map((i) => ({
    id: i.id,
    number: i.number,
    customerName: i.customerName ?? '—',
    dueOn: i.dueOn,
    balanceCents: i.subtotalCents - Number(i.paid),
  }))

  const recentReceipts = await db
    .select({
      id: cashReceipts.id,
      receivedOn: cashReceipts.receivedOn,
      method: cashReceipts.method,
      amountCents: cashReceipts.amountCents,
      customerName: customers.name,
    })
    .from(cashReceipts)
    .leftJoin(customers, eq(cashReceipts.customerId, customers.id))
    .orderBy(desc(cashReceipts.receivedOn), desc(cashReceipts.createdAt))
    .limit(5)

  return {
    cashCents: Number(cashCents),
    arCents: Number(arCents),
    revenueYtdCents: Number(revenueYtdCents),
    expensesYtdCents: Number(expensesYtdCents),
    openInvoices,
    recentReceipts: recentReceipts.map((r) => ({
      ...r,
      customerName: r.customerName ?? '—',
    })),
  }
})
