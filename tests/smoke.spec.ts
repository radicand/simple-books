import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const SHOTS = 'docs/screens'
mkdirSync(SHOTS, { recursive: true })

/** Responsive layouts duplicate amounts in hidden breakpoints; target visible nodes only. */
const visibleText = (page: import('@playwright/test').Page, text: string | RegExp) =>
  page.getByText(text).filter({ visible: true })

// Single end-to-end happy path. Assumes the server is running with a fresh
// DB (`bun run db:reset && bun run dev`).

const viewports = [
  { name: 'compact', width: 390, height: 844 },
  { name: 'comfortable', width: 768, height: 1024 },
  { name: 'spacious', width: 1280, height: 800 },
] as const

for (const vp of viewports) {
  test(`login layout at ${vp.name} (${vp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto(`${BASE}/login`)
    await expect(page.getByText('simple-books')).toBeVisible()
    await expect(page.locator('form')).toBeVisible()
  })
}

test('the full sole-proprietor flow works', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1440, height: 900 })

  // ---- Sign up the first/only owner ----
  await page.goto(`${BASE}/login`)
  await expect(page.getByRole('heading', { name: /create your owner/i })).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/01-login.png` })
  await page.fill('#name', 'Test Owner')
  await page.fill('#email', `owner@example.com`)
  await page.fill('#password', 'correcthorsebatterystaple')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/dashboard')
  await expect(page.getByText(/dashboard/i).first()).toBeVisible()

  // ---- Add a service product ----
  await page.getByRole('link', { name: /service products/i }).click()
  await page.getByRole('button', { name: /add your first service/i }).click()
  await page.fill('#svc-name', 'Consulting')
  await page.fill('#svc-unit', 'hour')
  await page.fill('#svc-rate', '150')
  await page.getByRole('button', { name: /create service/i }).click()
  await expect(page.getByText('Consulting')).toBeVisible()
  await expect(page.getByText(/\$150\.00/).first()).toBeVisible()

  // ---- Add a customer ----
  await page.getByRole('link', { name: /customers/i }).click()
  await page.getByRole('button', { name: /add your first customer/i }).click()
  await page.fill('#cus-name', 'Acme Co.')
  await page.fill('#cus-email', 'ap@acme.com')
  await page.locator('form').getByRole('button', { name: /add customer/i }).click()
  await expect(page.getByText('Acme Co.')).toBeVisible()

  // ---- Create an invoice ----
  await page.getByRole('link', { name: /^invoices/i }).click()
  await page.getByRole('link', { name: /create your first invoice/i }).click()
  // Desktop layout uses the line-items table (mobile selects are hidden at 1440px)
  const lineItems = page.getByRole('table')
  await lineItems.locator('select').selectOption({ label: 'Consulting' })
  await lineItems.locator('input[inputmode="decimal"]').first().fill('2')
  await page.getByRole('button', { name: /create invoice/i }).click()
  await page.waitForURL(/\/invoices\/inv_/)
  await expect(page.getByText(/invoice 2026-/i)).toBeVisible()
  await expect(visibleText(page, '$300.00').first()).toBeVisible()

  // ---- Log a payment for that invoice ----
  await page.getByRole('link', { name: /log payment/i }).click()
  await page.waitForURL(/\/receipts\/new/)
  await page.fill('#r-amt', '300')
  await page.getByRole('button', { name: /^log payment$/i }).click()
  await page.waitForURL(/\/receipts/)

  // ---- Log a stand-alone payment to test auto-invoice ----
  await page.getByRole('link', { name: /log payment/i }).click()
  await page.locator('#r-inv').selectOption('') // ensure auto
  await page.fill('#r-amt', '50')
  await page.getByRole('button', { name: /^log payment$/i }).click()
  // The notice may appear briefly; check we get redirected to /receipts
  await page.waitForURL(/\/receipts/, { timeout: 5000 })

  // ---- Log a mileage trip ----
  await page.getByRole('link', { name: /^mileage$/i }).click()
  await page.getByRole('button', { name: /log your first trip/i }).click()
  await expect(page.getByRole('heading', { name: /log a trip/i })).toBeVisible()
  await page.getByLabel('Miles').fill('40')
  await page.getByLabel('Purpose').fill('Client visit - Acme')
  const logTrip = page.getByRole('button', { name: /^log trip$/i })
  await expect(logTrip).toBeEnabled()
  await logTrip.click()
  await expect(visibleText(page, 'Client visit - Acme').first()).toBeVisible({ timeout: 15_000 })
  await expect(visibleText(page, '$29.00').first()).toBeVisible()

  // ---- Reports: balance sheet should balance ----
  await page.getByRole('link', { name: /reports/i }).click()
  await expect(page.getByText('Balance Sheet').first()).toBeVisible()
  await expect(page.getByText(/in balance/i)).toBeVisible()
  // Cash should be $350, AR $0, owners contribution from mileage $29 (40 mi × 72.5¢)
  await expect(visibleText(page, '$350.00').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SHOTS}/05-balance-sheet.png` })

  // ---- Cash flow ----
  await page.getByRole('link', { name: /cash flow/i }).click()
  await expect(page.getByText(/closing cash/i)).toBeVisible()
  await expect(visibleText(page, '$350.00').first()).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SHOTS}/06-cash-flow.png` })

  // ---- Capture remaining screenshots ----
  await page.goto(`${BASE}/dashboard`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SHOTS}/02-dashboard.png` })

  await page.goto(`${BASE}/invoices`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SHOTS}/03-invoices.png` })

  await page.goto(`${BASE}/mileage`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${SHOTS}/04-mileage.png` })
})
