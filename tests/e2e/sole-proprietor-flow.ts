import { expect, type Page } from '@playwright/test'
import { E2E_REFERENCE_DATE } from '../reference-date'
import { captureScreenshot } from '../capture-screenshot'
import {
  expectedCashCents,
  formatUsd,
  mileageReimbursementCents,
} from './helpers/ledger'
import { E2E_OWNER } from './helpers/auth'
import { openModal, signUpOwner, visibleText, waitForRoute } from './helpers/ui'

const INVOICE_LINE_CENTS = 2 * 15_000
const INVOICE_PAYMENT_CENTS = 30_000
const STANDALONE_PAYMENT_CENTS = 5_000
const MILEAGE_MILES = 40

export type FlowCapture = {
  login?: string
  balanceSheet?: string
  cashFlow?: string
  dashboard?: string
  invoices?: string
  mileage?: string
}

/** UI happy path: bootstrap owner through ledger reports. */
export async function runSoleProprietorFlow(
  page: Page,
  captures?: FlowCapture,
) {
  await page.setViewportSize({ width: 1440, height: 900 })

  const cashCents = expectedCashCents({
    invoicePaymentCents: INVOICE_PAYMENT_CENTS,
    standalonePaymentCents: STANDALONE_PAYMENT_CENTS,
  })
  const mileageCents = mileageReimbursementCents(MILEAGE_MILES)
  const cashLabel = formatUsd(cashCents)
  const mileageLabel = formatUsd(mileageCents)

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /create your owner/i })).toBeVisible()
  if (captures?.login) await captureScreenshot(page, captures.login)
  await signUpOwner(page, E2E_OWNER, { skipGoto: true })

  await page.getByRole('link', { name: /service products/i }).click()
  await waitForRoute(page, '**/services', page.getByText('No services yet'))
  await openModal(
    page,
    page.getByRole('button', { name: /^new service$/i }),
    '#svc-name',
  )
  await page.locator('#svc-name').fill('Consulting')
  await page.fill('#svc-unit', 'hour')
  await page.fill('#svc-rate', '150')
  await page.getByRole('button', { name: /create service/i }).click()
  await expect(page.getByText('Consulting')).toBeVisible()
  await expect(page.getByText(/\$150\.00/).first()).toBeVisible()

  await page.getByRole('link', { name: /customers/i }).click()
  await waitForRoute(page, '**/customers', page.getByText('No customers yet'))
  await openModal(
    page,
    page.getByRole('button', { name: /^add customer$/i }),
    '#cus-name',
  )
  await page.locator('#cus-name').fill('Acme Co.')
  await page.fill('#cus-email', 'ap@acme.com')
  await page.locator('form').getByRole('button', { name: /add customer/i }).click()
  await expect(page.getByText('Acme Co.')).toBeVisible()

  await page.getByRole('link', { name: /^invoices/i }).click()
  await page.getByRole('link', { name: /create your first invoice/i }).click()
  const lineItems = page.getByRole('table')
  await lineItems.locator('select').selectOption({ label: 'Consulting' })
  await lineItems.locator('input[inputmode="decimal"]').first().fill('2')
  await page.getByRole('button', { name: /create invoice/i }).click()
  await page.waitForURL(/\/invoices\/inv_/)
  await expect(page.getByText(/invoice 2026-/i)).toBeVisible()
  await expect(visibleText(page, formatUsd(INVOICE_LINE_CENTS)).first()).toBeVisible()

  const invoiceId = page.url().split('/invoices/')[1]!.split(/[/?#]/)[0]!
  await page.goto(`/invoices/${invoiceId}/edit`)
  await expect(page.locator('#i-memo')).toBeVisible()
  const memo = page.locator('#i-memo')
  await memo.click()
  await memo.pressSequentially('Phase 1')
  await page.getByRole('button', { name: /save changes/i }).click()
  await page.waitForURL(new RegExp(`/invoices/${invoiceId}$`))
  await expect(page.getByText('Phase 1')).toBeVisible()

  await page.getByRole('link', { name: /log payment/i }).click()
  await page.waitForURL(/\/receipts\/new/)
  await page.fill('#r-amt', String(INVOICE_PAYMENT_CENTS / 100))
  await page.getByRole('button', { name: /^log payment$/i }).click()
  await page.waitForURL(/\/receipts/)
  await expect(page.getByText(formatUsd(INVOICE_PAYMENT_CENTS)).first()).toBeVisible()

  await page.getByRole('link', { name: /log payment/i }).click()
  await page.waitForURL(/\/receipts\/new/)
  await page.locator('#r-inv').selectOption({ value: '' })
  await page.fill('#r-amt', String(STANDALONE_PAYMENT_CENTS / 100))
  await page.getByRole('button', { name: /^log payment$/i }).click()
  await page.waitForURL(/\/receipts/)
  await expect(page.getByText(formatUsd(STANDALONE_PAYMENT_CENTS)).first()).toBeVisible()

  await page.getByRole('complementary').getByRole('link', { name: 'Mileage' }).click()
  await page.waitForURL(/\/mileage/)
  await page.getByRole('button', { name: /log your first trip/i }).click()
  await expect(page.locator('#m-miles')).toBeVisible()
  const tripDialog = page.getByRole('heading', { name: /log a trip/i })
  await page.locator('#m-miles').pressSequentially(String(MILEAGE_MILES))
  await page.locator('#m-purpose').pressSequentially('Client visit - Acme')
  const logTrip = page.getByRole('button', { name: /^log trip$/i })
  await expect(logTrip).toBeEnabled()
  await logTrip.click()
  await expect(tripDialog).toBeHidden({ timeout: 10_000 })
  await expect(page).toHaveURL(/\/mileage/)
  await expect(
    page.getByRole('main').getByText('Client visit - Acme').filter({ visible: true }).first(),
  ).toBeVisible()
  await expect(visibleText(page, mileageLabel).first()).toBeVisible()

  await page.getByRole('complementary').getByRole('link', { name: 'Reports' }).click()
  await page.waitForURL(/\/reports/)
  await expect(page.getByText('Balance Sheet').first()).toBeVisible()
  await expect(visibleText(page, /in balance/i).first()).toBeVisible()
  await expect(visibleText(page, cashLabel).first()).toBeVisible()
  if (captures?.balanceSheet) await captureScreenshot(page, captures.balanceSheet)

  await page.goto('/reports/cash-flow')
  await page.locator('#cf-from').fill('2026-01-01')
  await page.locator('#cf-to').fill(E2E_REFERENCE_DATE)
  await page.getByRole('button', { name: /^refresh$/i }).click()
  await expect(page.getByText(/closing cash/i)).toBeVisible()
  await expect(visibleText(page, cashLabel).first()).toBeVisible()
  if (captures?.cashFlow) await captureScreenshot(page, captures.cashFlow)

  await page.goto('/dashboard')
  await expect(page.getByText('Cash on hand')).toBeVisible()
  await expect(visibleText(page, cashLabel).first()).toBeVisible()
  await expect(page.getByText('Mon, May 18, 2026')).toBeVisible()

  if (captures?.dashboard) {
    await page.goto('/dashboard')
    await captureScreenshot(page, captures.dashboard)
  }
  if (captures?.invoices) {
    await page.goto('/invoices')
    await captureScreenshot(page, captures.invoices)
  }
  if (captures?.mileage) {
    await page.goto('/mileage')
    await captureScreenshot(page, captures.mileage)
  }
}
