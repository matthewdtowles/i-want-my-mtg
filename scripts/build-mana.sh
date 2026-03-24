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

# Copy woff2 font
cp "$MANA_DIR/fonts/mana.woff2" "$FONT_DIR/mana.woff2"

# Build CSS: custom woff2-first @font-face + all icon classes from the package
# - Strip BOM, remove original @font-face blocks and sourcemap comment
# - Prepend our own @font-face with local woff2 and CDN woff fallback
{
    printf '@font-face{font-family:"Mana";src:url("/public/fonts/mana.woff2") format("woff2"),url("https://cdn.jsdelivr.net/npm/mana-font@%s/fonts/mana.woff?v=%s") format("woff");font-weight:normal;font-style:normal}' \
        "$MANA_VERSION" "$MANA_VERSION"
    sed '1s/^\xEF\xBB\xBF//' "$MANA_DIR/css/mana.min.css" \
        | perl -pe 's/\@font-face\{[^}]*\}//g' \
        | sed 's|/\*# sourceMappingURL=.*\*/||g'
} > "$CSS_OUT"

echo "Built mana assets: $CSS_OUT, $FONT_DIR/mana.woff2"
