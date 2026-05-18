#!/usr/bin/env bash
# Run Playwright smoke tests (dev server + ephemeral SQLite DB are started by Playwright).
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

if [[ "$SKIP_BUILD" != true ]]; then
  echo "→ bun install"
  bun install --frozen-lockfile
  echo "→ production build"
  bun run build
fi

echo "→ playwright chromium"
bunx playwright install chromium

echo "→ playwright test (dev server + temp database)"
bun run test

echo "✓ e2e passed"
