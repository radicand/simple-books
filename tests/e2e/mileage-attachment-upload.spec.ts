import { test, expect } from '@playwright/test'
import { E2E_OWNER } from './helpers/auth'
import { signUpOwner, visibleText } from './helpers/ui'
import path from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

test('upload attachment on existing mileage detail page', async ({ page }) => {
  await signUpOwner(page, E2E_OWNER)

  await page.getByRole('complementary').getByRole('link', { name: 'Mileage' }).click()
  await page.getByRole('button', { name: /log your first trip/i }).click()
  await page.locator('#m-miles').fill('25')
  await page.locator('#m-purpose').fill('Attachment test trip')
  await page.getByRole('button', { name: /^log trip$/i }).click()
  const trip = visibleText(page, 'Attachment test trip').first()
  await expect(trip).toBeVisible()
  await trip.click()
  await page.waitForURL(/\/mileage\/mil_/)

  const tmp = mkdtempSync(path.join(tmpdir(), 'sb-upload-'))
  const pdf = path.join(tmp, 'receipt.pdf')
  writeFileSync(pdf, '%PDF-1.4 test')

  await page.locator('input[type="file"]').setInputFiles(pdf)
  await expect(page.getByText(/invalid source id/i)).toHaveCount(0)
  await expect(page.getByText('receipt.pdf')).toBeVisible({ timeout: 15_000 })
})
