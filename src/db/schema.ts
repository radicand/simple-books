import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Business schema for simple-books. All amounts stored as INTEGER cents.
 * Quantities and per-unit rates stored as INTEGER micro-units (×1e6) to
 * support fractional values without float drift.
 */

const ts = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)

// ---- Settings (kv) ----
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

// ---- Chart of Accounts ----
export const chartAccounts = sqliteTable('chart_accounts', {
  code: text('code').primaryKey(), // e.g. '1000'
  name: text('name').notNull(),
  type: text('type', {
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
  }).notNull(),
  normal: text('normal', { enum: ['debit', 'credit'] }).notNull(),
  createdAt: ts(),
})

// ---- Customers ----
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  notes: text('notes'),
  createdAt: ts(),
})

// ---- Service Products ----
export const serviceProducts = sqliteTable('service_products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  unit: text('unit').notNull(), // 'hour' | 'session' | 'project' | custom
  rateCents: integer('rate_cents').notNull(), // per-unit price in cents
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: ts(),
})

// ---- Invoices ----
export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    number: text('number').notNull().unique(), // e.g. '2026-0001'
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    issuedOn: text('issued_on').notNull(), // ISO date
    dueOn: text('due_on').notNull(),
    status: text('status', { enum: ['open', 'paid', 'void'] })
      .notNull()
      .default('open'),
    memo: text('memo'),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    autoCreated: integer('auto_created', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: ts(),
  },
  (t) => ({
    customerIdx: index('invoices_customer_idx').on(t.customerId),
    statusIdx: index('invoices_status_idx').on(t.status),
  }),
)

export const invoiceLines = sqliteTable(
  'invoice_lines',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    serviceProductId: text('service_product_id').references(
      () => serviceProducts.id,
    ),
    description: text('description').notNull(),
    quantityMicro: integer('quantity_micro').notNull(), // qty × 1e6
    unitPriceCents: integer('unit_price_cents').notNull(),
    amountCents: integer('amount_cents').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => ({
    invoiceIdx: index('invoice_lines_invoice_idx').on(t.invoiceId),
  }),
)

// ---- Cash Receipts ----
export const cashReceipts = sqliteTable(
  'cash_receipts',
  {
    id: text('id').primaryKey(),
    receivedOn: text('received_on').notNull(), // ISO date
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id),
    amountCents: integer('amount_cents').notNull(),
    method: text('method', {
      enum: ['cash', 'check', 'card', 'transfer', 'other'],
    })
      .notNull()
      .default('transfer'),
    memo: text('memo'),
    createdAt: ts(),
  },
  (t) => ({
    customerIdx: index('cash_receipts_customer_idx').on(t.customerId),
    invoiceIdx: index('cash_receipts_invoice_idx').on(t.invoiceId),
    dateIdx: index('cash_receipts_date_idx').on(t.receivedOn),
  }),
)

// ---- Mileage rates (per calendar year) ----
export const mileageRates = sqliteTable('mileage_rates', {
  taxYear: integer('tax_year').primaryKey(),
  rateMicroPerMile: integer('rate_micro_per_mile').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

// ---- Mileage Entries ----
export const mileageEntries = sqliteTable(
  'mileage_entries',
  {
    id: text('id').primaryKey(),
    tripDate: text('trip_date').notNull(), // ISO date
    milesMicro: integer('miles_micro').notNull(), // miles × 1e6
    rateMicroPerMile: integer('rate_micro_per_mile').notNull(), // $/mi × 1e6
    purpose: text('purpose').notNull(),
    amountCents: integer('amount_cents').notNull(),
    createdAt: ts(),
  },
  (t) => ({
    dateIdx: index('mileage_entries_date_idx').on(t.tripDate),
  }),
)

// ---- Attachments (receipts, invoices, mileage supporting docs) ----
export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type', {
      enum: ['invoice', 'cash_receipt', 'mileage'],
    }).notNull(),
    sourceId: text('source_id').notNull(),
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: ts(),
  },
  (t) => ({
    sourceIdx: index('attachments_source_idx').on(t.sourceType, t.sourceId),
  }),
)

// ---- Journal (double-entry ledger) ----
export const journalEntries = sqliteTable(
  'journal_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(), // ISO date
    memo: text('memo').notNull(),
    source: text('source', {
      enum: ['invoice', 'cash_receipt', 'mileage', 'manual', 'reversal'],
    }).notNull(),
    sourceId: text('source_id'),
    reversedById: text('reversed_by_id'),
    createdAt: ts(),
  },
  (t) => ({
    dateIdx: index('journal_entries_date_idx').on(t.date),
    sourceIdx: index('journal_entries_source_idx').on(t.source, t.sourceId),
  }),
)

export const journalLines = sqliteTable(
  'journal_lines',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => journalEntries.id, { onDelete: 'cascade' }),
    accountCode: text('account_code')
      .notNull()
      .references(() => chartAccounts.code),
    debitCents: integer('debit_cents').notNull().default(0),
    creditCents: integer('credit_cents').notNull().default(0),
    memo: text('memo'),
    position: integer('position').notNull().default(0),
  },
  (t) => ({
    entryIdx: index('journal_lines_entry_idx').on(t.entryId),
    accountIdx: index('journal_lines_account_idx').on(t.accountCode),
  }),
)

export type Customer = typeof customers.$inferSelect
export type ServiceProduct = typeof serviceProducts.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type InvoiceLine = typeof invoiceLines.$inferSelect
export type CashReceipt = typeof cashReceipts.$inferSelect
export type MileageEntry = typeof mileageEntries.$inferSelect
export type JournalEntry = typeof journalEntries.$inferSelect
export type JournalLine = typeof journalLines.$inferSelect
