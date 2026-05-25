import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuthMiddleware } from '~/lib/auth.functions'
import { ACCT } from '~/server/posting'
import { todayISO } from '~/lib/date'

export const getBalanceSheet = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z.object({ asOf: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { chartAccounts, journalEntries, journalLines } = await import('~/db/schema')
    const { asc, eq, sql } = await import('drizzle-orm')

    const asOf = data.asOf || todayISO()

    const rows = await db
      .select({
        code: chartAccounts.code,
        name: chartAccounts.name,
        type: chartAccounts.type,
        normal: chartAccounts.normal,
        dr: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.id} IS NOT NULL AND ${journalEntries.date} <= ${asOf} THEN ${journalLines.debitCents} ELSE 0 END), 0)`,
        cr: sql<number>`COALESCE(SUM(CASE WHEN ${journalEntries.id} IS NOT NULL AND ${journalEntries.date} <= ${asOf} THEN ${journalLines.creditCents} ELSE 0 END), 0)`,
      })
      .from(chartAccounts)
      .leftJoin(journalLines, eq(journalLines.accountCode, chartAccounts.code))
      .leftJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .groupBy(chartAccounts.code, chartAccounts.name, chartAccounts.type, chartAccounts.normal)
      .orderBy(asc(chartAccounts.code))

    const bal = rows.map((r) => {
      const dr = Number(r.dr)
      const cr = Number(r.cr)
      const balance = r.normal === 'debit' ? dr - cr : cr - dr
      return { ...r, dr, cr, balance }
    })

    const assets = bal.filter((b) => b.type === 'asset')
    const liabilities = bal.filter((b) => b.type === 'liability')
    const equity = bal.filter((b) => b.type === 'equity')
    const revenue = bal.filter((b) => b.type === 'revenue')
    const expense = bal.filter((b) => b.type === 'expense')

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)
    const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0)
    const totalExpense = expense.reduce((s, a) => s + a.balance, 0)
    const retainedEarnings = totalRevenue - totalExpense
    const totalEquity =
      equity.reduce((s, a) => s + a.balance, 0) + retainedEarnings

    return {
      asOf,
      assets: assets.filter((a) => a.balance !== 0),
      liabilities,
      equity: equity.filter((e) => e.balance !== 0),
      retainedEarnings,
      totals: {
        assets: totalAssets,
        liabilities: totalLiabilities,
        equity: totalEquity,
        liabilitiesPlusEquity: totalLiabilities + totalEquity,
        balances: totalAssets === totalLiabilities + totalEquity,
        difference: totalAssets - (totalLiabilities + totalEquity),
      },
    }
  })

export const getCashFlow = createServerFn({ method: 'GET' }).middleware([requireAuthMiddleware])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    // auth enforced by requireAuthMiddleware
    const { db } = await import('~/db/client')
    const { cashReceipts, customers, journalEntries, journalLines } = await import('~/db/schema')
    const { and, asc, eq, gte, lte, sql } = await import('drizzle-orm')

    const [openingRow] = await db
      .select({
        dr: sql<number>`COALESCE(SUM(${journalLines.debitCents}),0)`,
        cr: sql<number>`COALESCE(SUM(${journalLines.creditCents}),0)`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.entryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.accountCode, ACCT.CASH),
          sql`${journalEntries.date} < ${data.from}`,
        ),
      )
    const opening = Number(openingRow?.dr ?? 0) - Number(openingRow?.cr ?? 0)

    const inflows = await db
      .select({
        id: cashReceipts.id,
        date: cashReceipts.receivedOn,
        amountCents: cashReceipts.amountCents,
        method: cashReceipts.method,
        memo: cashReceipts.memo,
        customerName: customers.name,
      })
      .from(cashReceipts)
      .leftJoin(customers, eq(cashReceipts.customerId, customers.id))
      .where(
        and(
          gte(cashReceipts.receivedOn, data.from),
          lte(cashReceipts.receivedOn, data.to),
        ),
      )
      .orderBy(asc(cashReceipts.receivedOn))

    const totalIn = inflows.reduce((s, r) => s + r.amountCents, 0)
    const totalOut = 0

    return {
      from: data.from,
      to: data.to,
      opening,
      inflows: inflows.map((r) => ({ ...r, customerName: r.customerName ?? '—' })),
      outflows: [] as Array<{ id: string; date: string; amountCents: number; memo: string | null }>,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      closing: opening + totalIn - totalOut,
    }
  })
