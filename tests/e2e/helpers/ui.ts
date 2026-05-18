import { expect, type Locator, type Page } from '@playwright/test'
import { E2E_OWNER } from './auth'

/** Responsive layouts duplicate amounts in hidden breakpoints; target visible nodes only. */
export function visibleText(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true })
}

/** URL matches and a route-specific ready locator is visible. */
export async function waitForRoute(
  page: Page,
  url: string | RegExp,
  ready: Locator,
) {
  await page.waitForURL(url)
  await expect(ready).toBeVisible()
}

/** Click a modal trigger and wait for a field inside the dialog. */
export async function openModal(page: Page, trigger: Locator, fieldSelector: string) {
  await trigger.click()
  await expect(page.locator(fieldSelector)).toBeVisible()
}

export async function signIn(
  page: Page,
  opts: { email: string; password: string } = E2E_OWNER,
) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  await page.fill('#email', opts.email)
  await page.fill('#password', opts.password)

  const signInResponse = page.waitForResponse(
    (r) => r.url().includes('sign-in') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: /sign in/i }).click()
  const res = await signInResponse
  if (!res.ok()) {
    throw new Error(`Sign-in failed (${res.status()})`)
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)/,
  )
}

export async function signOut(page: Page) {
  await page.getByRole('complementary').getByRole('button', { name: /sign out/i }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
}

export async function signUpOwner(
  page: Page,
  opts: { name: string; email: string; password: string } = E2E_OWNER,
  options?: { skipGoto?: boolean },
) {
  if (!options?.skipGoto) await page.goto('/login')
  await expect(page.getByRole('heading', { name: /create your owner/i })).toBeVisible()
  await page.fill('#name', opts.name)
  await page.fill('#email', opts.email)
  await page.fill('#password', opts.password)

  const signupResponse = page.waitForResponse(
    (r) => r.url().includes('sign-up') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: /create account/i }).click()
  const res = await signupResponse
  if (!res.ok()) {
    const err = page
      .locator('[class*="color-negative"]')
      .filter({ hasText: /\S/ })
      .first()
    if (await err.isVisible().catch(() => false)) {
      throw new Error(`Sign-up failed: ${await err.innerText()}`)
    }
    throw new Error(`Sign-up failed (${res.status()})`)
  }

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)/,
  )
}
