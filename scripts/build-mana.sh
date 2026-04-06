#!/bin/bash
# Build mana font assets from the mana-font npm package.
# Generates a clean CSS file (no BOM, no sourcemap, woff2-first @font-face)
# and copies the woff2 font to the public directory.

set -euo pipefail

MANA_DIR="node_modules/mana-font"
MANA_VERSION="1.18.0"
CSS_OUT="src/http/public/css/mana.css"
FONT_DIR="src/http/public/fonts"

if [ ! -d "$MANA_DIR" ]; then
    echo "Error: mana-font not found in node_modules. Run npm install first." >&2
    exit 1
fi

mkdir -p "$FONT_DIR"
mkdir -p "$(dirname "$CSS_OUT")"

# Copy woff2 font (skip if target is up-to-date or not writable by us)
if [ ! -f "$FONT_DIR/mana.woff2" ] || [ "$MANA_DIR/fonts/mana.woff2" -nt "$FONT_DIR/mana.woff2" ]; then
    cp "$MANA_DIR/fonts/mana.woff2" "$FONT_DIR/mana.woff2"
fi

# Build CSS to a temp file first, then move into place.
# This avoids leaving a truncated file if perl or printf fails mid-write.
CSS_TMP="${CSS_OUT}.tmp"
{
    printf '@font-face{font-family:"Mana";src:url("/public/fonts/mana.woff2") format("woff2"),url("https://cdn.jsdelivr.net/npm/mana-font@%s/fonts/mana.woff?v=%s") format("woff");font-weight:normal;font-style:normal}' \
        "$MANA_VERSION" "$MANA_VERSION"
    perl -pe 's/\xEF\xBB\xBF//g; s/\@font-face\{[^}]*\}//g; s|/\*# sourceMappingURL=.*\*/||g' "$MANA_DIR/css/mana.min.css"
} > "$CSS_TMP"

# Sanity check: the output should contain icon classes, not just the @font-face
if [ "$(wc -c < "$CSS_TMP")" -lt 1000 ]; then
    echo "Error: generated mana CSS is suspiciously small ($(wc -c < "$CSS_TMP") bytes). Aborting." >&2
    rm -f "$CSS_TMP"
    exit 1
fi

mv "$CSS_TMP" "$CSS_OUT"
echo "Built mana assets: $CSS_OUT, $FONT_DIR/mana.woff2"
