import { test } from '@playwright/test'
import { runLifecycleFlows } from './lifecycle-flow'
import { runSoleProprietorFlow } from './sole-proprietor-flow'

test.describe.configure({ mode: 'serial' })

test('the full sole-proprietor flow works', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await runSoleProprietorFlow(page)
})

test('post-bootstrap lifecycle flows', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await runLifecycleFlows(page)
})
