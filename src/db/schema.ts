import { isPostgres } from './dialect'
import * as pg from './schema.pg'
import * as sqlite from './schema.sqlite'

const s = isPostgres() ? pg : sqlite

export const settings = s.settings
export const chartAccounts = s.chartAccounts
export const customers = s.customers
export const serviceProducts = s.serviceProducts
export const invoices = s.invoices
export const invoiceLines = s.invoiceLines
export const cashReceipts = s.cashReceipts
export const mileageRates = s.mileageRates
export const mileageEntries = s.mileageEntries
export const attachments = s.attachments
export const journalEntries = s.journalEntries
export const journalLines = s.journalLines

export type Customer = typeof customers.$inferSelect
export type ServiceProduct = typeof serviceProducts.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type InvoiceLine = typeof invoiceLines.$inferSelect
export type CashReceipt = typeof cashReceipts.$inferSelect
export type MileageEntry = typeof mileageEntries.$inferSelect
export type JournalEntry = typeof journalEntries.$inferSelect
export type JournalLine = typeof journalLines.$inferSelect
