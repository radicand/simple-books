#!/usr/bin/env bash
# Run Playwright smoke tests against a fresh production build + DB.
# Usage: ./scripts/e2e.sh [--skip-build]
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${E2E_PORT:-3000}"
BASE="http://localhost:${PORT}"
SKIP_BUILD=false
SERVER_PID=""

for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

export NODE_ENV=production
export BETTER_AUTH_URL="$BASE"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-local-e2e-secret-at-least-32-characters-long}"
export DATABASE_URL=./data/simple-books.db
export PORT

if lsof -i ":${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port ${PORT} is in use. Stop the dev server or set E2E_PORT." >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != true ]]; then
  echo "→ bun install"
  bun install --frozen-lockfile
  echo "→ production build"
  bun run build
fi

echo "→ playwright chromium"
bunx playwright install chromium

echo "→ fresh database"
bun run db:reset

echo "→ start server on ${BASE}"
bun run start &
SERVER_PID=$!

echo "→ wait for health"
for _ in $(seq 1 30); do
  if curl -sf "${BASE}/api/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl -sf "${BASE}/api/health" | grep -q '"status":"ok"' || {
  echo "Server did not become healthy at ${BASE}/api/health" >&2
  exit 1
}

echo "→ playwright test"
bun run test

echo "✓ e2e passed"
