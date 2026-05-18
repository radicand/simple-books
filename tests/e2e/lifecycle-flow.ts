import { expect, type Page } from '@playwright/test'
import { E2E_REFERENCE_DATE } from '../reference-date'
import { formatUsd, mileageReimbursementCents } from './helpers/ledger'
import { openModal, signIn, signOut, visibleText } from './helpers/ui'

const VOID_INVOICE_CENTS = 15_000
const RATE_CHECK_MILES = 10

/** Post-bootstrap flows; requires catalog data from `runSoleProprietorFlow`. */
export async function runLifecycleFlows(page: Page) {
  await signIn(page)
  await signOut(page)
  await signIn(page)

  await expect(page.getByText('Cash on hand')).toBeVisible()

  await voidOpenInvoice(page)
  await deleteStandalonePayment(page)
  await verifySettingsAndLogTrip(page)
}

async function voidOpenInvoice(page: Page) {
  await page.goto('/invoices/new')
  await expect(page.getByRole('heading', { name: /new invoice/i })).toBeVisible()
  await page.locator('#i-cus').selectOption({ label: 'Acme Co.' })
  const lineItems = page.getByRole('table')
  await lineItems.locator('select').selectOption({ label: 'Consulting' })
  await lineItems.locator('input[inputmode="decimal"]').first().fill('1')
  await page.getByRole('button', { name: /create invoice/i }).click()
  await page.waitForURL(/\/invoices\/inv_/)
  await expect(page.getByText(/invoice 2026-/i)).toBeVisible()
  await expect(visibleText(page, formatUsd(VOID_INVOICE_CENTS)).first()).toBeVisible()

  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: /^void$/i }).click()
  await expect(page.getByText('Void')).toBeVisible()
}

async function deleteStandalonePayment(page: Page) {
  await page.goto('/receipts')
  await expect(page.getByRole('heading', { name: /cash receipts/i })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '$50.00' })
  await expect(row).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await row.getByRole('button', { name: /delete payment/i }).click()
  await expect(page.getByRole('row').filter({ hasText: '$50.00' })).toHaveCount(0)
}

async function verifySettingsAndLogTrip(page: Page) {
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible()
  await expect(
    page.getByRole('row').filter({ hasText: '2026' }).getByText(/72\.5/),
  ).toBeVisible()

  await page.getByRole('complementary').getByRole('link', { name: 'Mileage' }).click()
  await page.waitForURL(/\/mileage/)
  await page.getByRole('button', { name: /^add trip$/i }).click()
  await expect(page.locator('#m-miles')).toBeVisible()
  await page.locator('#m-miles').pressSequentially(String(RATE_CHECK_MILES))
  await page.locator('#m-purpose').pressSequentially('Rate check trip')
  const logTrip = page.getByRole('button', { name: /^log trip$/i })
  await expect(logTrip).toBeEnabled()
  await logTrip.click()
  await expect(page.getByRole('heading', { name: /log a trip/i })).toBeHidden({
    timeout: 10_000,
  })

  const expected = formatUsd(mileageReimbursementCents(RATE_CHECK_MILES))
  await expect(
    page.getByRole('main').getByText('Rate check trip').filter({ visible: true }).first(),
  ).toBeVisible()
  await expect(visibleText(page, expected).first()).toBeVisible()
}
