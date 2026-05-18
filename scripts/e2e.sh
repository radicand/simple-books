#!/usr/bin/env bash
# Full local e2e: install, e2e production build, Playwright (prod server + ephemeral SQLite).
# Usage: ./scripts/e2e.sh [--skip-build]
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-local-e2e-secret-at-least-32-characters-long}"
export PLAYWRIGHT_USE_PROD=1

if [[ "$SKIP_BUILD" != true ]]; then
  echo "→ bun install"
  bun install --frozen-lockfile
  echo "→ e2e production build (REFERENCE_DATE baked in)"
  bun run build:e2e
fi

if [[ ! -f .output/server/index.mjs ]]; then
  echo "Missing .output — run without --skip-build or: bun run build:e2e" >&2
  exit 1
fi

echo "→ playwright chromium"
bunx playwright install chromium

echo "→ playwright test (production server + temp database)"
bun run test

echo "✓ e2e passed"
