#!/usr/bin/env bash
set -euo pipefail

# Minify every public JS file from src/ into dist/ using terser.
# Used by `npm run build:js` and the `build:prod` pipeline.

SRC_DIR="src/http/public/js"
DEST_DIR="dist/http/public/js"

mkdir -p "$DEST_DIR"

for f in "$SRC_DIR"/*.js; do
    [ -e "$f" ] || continue
    npx terser "$f" --compress --mangle -o "$DEST_DIR/$(basename "$f")"
done
