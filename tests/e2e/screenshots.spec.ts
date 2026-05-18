import { test } from '@playwright/test'
import { runSoleProprietorFlow } from './sole-proprietor-flow'

const SHOTS = 'docs/screens'

test.describe.configure({ mode: 'serial' })

test('@screenshots README screens', async ({ page }) => {
  test.setTimeout(120_000)
  await runSoleProprietorFlow(page, {
    login: `${SHOTS}/01-login.png`,
    balanceSheet: `${SHOTS}/05-balance-sheet.png`,
    cashFlow: `${SHOTS}/06-cash-flow.png`,
    dashboard: `${SHOTS}/02-dashboard.png`,
    invoices: `${SHOTS}/03-invoices.png`,
    mileage: `${SHOTS}/04-mileage.png`,
  })
})
