/**
 * Pick a free port, then run Playwright (config reads PLAYWRIGHT_PORT).
 */
import { spawnSync } from 'node:child_process'
import { getFreePort } from '../tests/playwright-env'

const port = await getFreePort()
const result = spawnSync('bunx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_PORT: String(port),
  },
})
process.exit(result.status ?? 1)
