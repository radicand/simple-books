/**
 * Pick a free port, then run Playwright (config reads PLAYWRIGHT_PORT).
 * Requires `bun run build:e2e` first so client and server share REFERENCE_DATE.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { getFreePort } from '../tests/playwright-env'

const prodEntry = join(process.cwd(), '.output/server/index.mjs')
if (!existsSync(prodEntry)) {
  console.error('Missing e2e build. Run: bun run build:e2e')
  process.exit(1)
}

const port = await getFreePort()
const result = spawnSync('bunx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_PORT: String(port),
    PLAYWRIGHT_USE_PROD: '1',
  },
})
process.exit(result.status ?? 1)
