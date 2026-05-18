import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT)
if (!port) {
  throw new Error(
    'PLAYWRIGHT_PORT is not set. Run tests via `bun run test` (not `playwright test` directly).',
  )
}

const baseURL = `http://127.0.0.1:${port}`
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  'playwright-e2e-secret-at-least-32-characters'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'bun run scripts/playwright-web-server.ts',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PLAYWRIGHT_PORT: String(port),
      BETTER_AUTH_SECRET: authSecret,
    },
  },
})
