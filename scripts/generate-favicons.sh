#!/usr/bin/env bash
# Regenerate raster favicons from public/favicon.svg (macOS qlmanage + sips).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="$ROOT/public"
SVG="$PUB/favicon.svg"
TMP="$(mktemp /tmp/favicon-render.XXXXXX.png)"

cleanup() { rm -f "$TMP" /tmp/favicon.svg.png; }
trap cleanup EXIT

qlmanage -t -s 512 -o /tmp "$SVG" >/dev/null 2>&1
mv /tmp/favicon.svg.png "$TMP"

sips -z 180 180 "$TMP" --out "$PUB/apple-touch-icon.png" >/dev/null
sips -z 32 32 "$TMP" --out "$PUB/favicon-32x32.png" >/dev/null
sips -z 16 16 "$TMP" --out "$PUB/favicon-16x16.png" >/dev/null

echo "Wrote $PUB/{favicon-16x16,favicon-32x32,apple-touch-icon}.png"
