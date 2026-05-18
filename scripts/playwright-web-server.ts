/**
 * Playwright webServer entrypoint: fresh temp SQLite DB, migrate/seed, then app server.
 * Temp directory is removed when this process exits (including SIGTERM from Playwright).
 *
 * CI runs `bun run build` first — use the production server so auth cookies and SSR match
 * the built bundle. Local runs without a build use Vite dev (and clear stale artifacts).
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const cwd = process.cwd()
const prodEntry = join(cwd, '.output/server/index.mjs')
const useProd =
  process.env.PLAYWRIGHT_USE_PROD === '1' ||
  (process.env.CI === 'true' && existsSync(prodEntry))

function clearDevArtifacts() {
  for (const dir of [
    join(cwd, '.output'),
    join(cwd, 'node_modules/.nitro'),
    join(cwd, '.vite'),
    join(cwd, '.tanstack'),
  ]) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  }
}

if (!useProd) clearDevArtifacts()

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
  NODE_ENV: useProd ? 'production' : 'development',
  PORT: port,
  DATABASE_URL: dbPath,
  BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'playwright-e2e-secret-at-least-32-characters',
}

for (const script of ['scripts/migrate.ts', 'scripts/seed.ts']) {
  const result = spawnSync('bun', ['run', script], { env, stdio: 'inherit' })
  if (result.status !== 0) {
    cleanup()
    process.exit(result.status ?? 1)
  }
}

const server = useProd
  ? spawn('bun', ['run', prodEntry], { env, stdio: 'inherit' })
  : spawn('bun', ['--bun', 'vite', 'dev', '--port', port, '--host', '127.0.0.1'], {
      env,
      stdio: 'inherit',
    })

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
