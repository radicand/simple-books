#!/bin/sh
set -eu
cd /app
bun run scripts/migrate.ts
exec bun run .output/server/index.mjs
