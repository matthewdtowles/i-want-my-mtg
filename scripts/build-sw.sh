#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
SRC="src/http/public/sw.js"
DEST="dist/http/public/sw.js"

mkdir -p "$(dirname "$DEST")"
sed "s/__APP_VERSION__/$VERSION/g" "$SRC" > "$DEST"
