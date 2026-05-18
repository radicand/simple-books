---
name: accounting-posting
description: Documents double-entry journal posting via postJournalSync, ACCT codes, and MVP recipes in simple-books. Use when adding business events, invoices, payments, mileage, reversals, or ledger entries.
---

# Posting a business event

Every business event must produce a balanced journal entry (sum of debits = sum of credits).

## Where to post

Use `postJournalSync(tx, { date, memo, source, sourceId, lines })` from
`src/server/invoices.functions.ts` (sync Drizzle/`bun:sqlite` transactions). The function:

- Validates debits = credits.
- Throws on a zero-amount entry.
- Writes one `journal_entries` row and `n` `journal_lines` rows in one tx.

## Canonical account codes

Pulled from `ACCT` in `src/server/posting.server.ts`. Don't hardcode strings.

| Code | Constant            | Purpose                        |
| ---- | ------------------- | ------------------------------ |
| 1000 | `CASH`              | Cash on hand / bank            |
| 1100 | `AR`                | Accounts Receivable            |
| 3000 | `OWNERS_EQUITY`     | Owner's Equity (umbrella)      |
| 3010 | `OWNERS_CONTRIBUTION` | Capital contributed by owner |
| 3020 | `OWNERS_DRAW`       | Cash withdrawn by owner        |
| 4000 | `SERVICES_REVENUE`  | Revenue from billed services   |
| 6100 | `VEHICLE_EXPENSE`   | Mileage-based vehicle expense  |

## Recipes (MVP only)

```
Issue invoice:        DR 1100 A/R                 CR 4000 Services Revenue
Receive cash:         DR 1000 Cash                CR 1100 A/R
Auto-invoice pmt:     (issue + receive, same tx; auto_created=true)
Mileage trip:         DR 6100 Vehicle Expense     CR 3010 Owner's Contribution
Void invoice:         DR 4000 Services Revenue    CR 1100 A/R     (reversal)
Reverse a receipt:    DR 1100 A/R                 CR 1000 Cash    (reversal)
```

## Adding a new event

1. Add inputs to a `*.functions.ts` createServerFn (see [adding-a-server-fn](../adding-a-server-fn/SKILL.md)).
2. Validate with Zod, then open `db.transaction((tx) => ...)`.
3. Insert the business row.
4. Call `postJournalSync(tx, { ... })` with the right `ACCT.*` codes.
5. Update related invoice status if settled.
6. If undoable, implement a reversal endpoint (debits/credits swapped) — never edit a posted journal entry.

## Editing a business record

Never update `journal_entries` / `journal_lines` in place. In one `db.transaction`:

1. `postJournalSync` with `source: 'reversal'` and debits/credits **swapped** from the original entry (`reverseInvoiceJournal`, or mirror `deleteReceipt` / `deleteMileage`).
2. Update the business row (`invoices`, `cash_receipts`, `mileage_entries`, …).
3. `postJournalSync` with the original `source` and corrected amounts.

Helpers in `src/server/posting.ts`: `reverseInvoiceJournal`, `postInvoiceJournal`, `cascadeAutoInvoiceAmount` (when a stand-alone payment’s auto-invoice must stay in sync), `recalcInvoiceStatusSync`.

## Money + quantities

- Money: integer cents. Use `parseDollarsToCents` and `fmtCents`.
- Quantities (hours, miles): integer micro-units (×1e6). Use `parseQuantityToMicro` and `microToDecimal`.
- Line amount = `Math.round(qtyMicro * unitPriceCents / 1e6)` (use BigInt to avoid overflow).
