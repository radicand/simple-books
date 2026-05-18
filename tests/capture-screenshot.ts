import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Page, PageScreenshotOptions } from '@playwright/test'

/** Set `UPDATE_SCREENSHOTS=1` to refresh committed README images in `docs/screens/`. */
export const updateScreenshots = process.env.UPDATE_SCREENSHOTS === '1'

export async function captureScreenshot(
  page: Page,
  path: string,
  options?: PageScreenshotOptions,
) {
  if (!updateScreenshots) return
  mkdirSync(dirname(path), { recursive: true })
  await page.screenshot({ path, ...options })
}
