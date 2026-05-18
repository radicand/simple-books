/**
 * Playwright webServer entrypoint: fresh temp SQLite DB, migrate/seed, production server.
 * Temp directory is removed when this process exits (including SIGTERM from Playwright).
 *
 * Requires a production build with REFERENCE_DATE baked in (see `bun run build:e2e`).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { E2E_REFERENCE_DATE } from '../tests/reference-date.ts'

const cwd = process.cwd()
const prodEntry = join(cwd, '.output/server/index.mjs')
const useProd = process.env.PLAYWRIGHT_USE_PROD === '1'

if (!useProd) {
  console.error(
    'PLAYWRIGHT_USE_PROD=1 is required. Run tests via `bun run test` (not playwright test directly).',
  )
  process.exit(1)
}

if (!existsSync(prodEntry)) {
  console.error(
    'Missing production build (.output/server/index.mjs). Run: bun run build:e2e',
  )
  process.exit(1)
}

const port = process.env.PLAYWRIGHT_PORT
if (!port) {
  console.error('PLAYWRIGHT_PORT is required')
  process.exit(1)
}

const dbDir = mkdtempSync(join(tmpdir(), 'simple-books-pw-'))
const dbPath = join(dbDir, 'test.db')

function cleanup() {
  try {
    rmSync(dbDir, { recursive: true, force: true })
  } catch {
    // best-effort
  }
}

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: port,
  DATABASE_URL: dbPath,
  BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'playwright-e2e-secret-at-least-32-characters',
  REFERENCE_DATE: E2E_REFERENCE_DATE,
}

for (const script of ['scripts/migrate.ts', 'scripts/seed.ts']) {
  const result = spawnSync('bun', ['run', script], { env, stdio: 'inherit' })
  if (result.status !== 0) {
    cleanup()
    process.exit(result.status ?? 1)
  }
}

const server = spawn('bun', [prodEntry], { env, stdio: 'inherit' })

let shuttingDown = false
function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return
  shuttingDown = true
  server.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

server.on('exit', (code, signal) => {
  cleanup()
  if (signal === 'SIGTERM' || signal === 'SIGINT') {
    process.exit(0)
  }
  process.exit(code ?? 1)
})
