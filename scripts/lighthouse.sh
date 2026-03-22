#!/usr/bin/env bash
#
# Run Lighthouse audits against key pages and produce a summary report.
# Runs both mobile and desktop presets with separate reports.
#
# Usage:
#   npm run lighthouse                        # audit http://localhost:3000 (public pages only)
#   npm run lighthouse -- --auth              # also audit authenticated pages (prompts for credentials)
#   npm run lighthouse -- --base-url=https://example.com
#   npm run lighthouse -- --category=performance
#
# Prerequisites:
#   npm install -g lighthouse   (or npx will fetch it)
#   Chrome/Chromium installed
#
set -euo pipefail

BASE_URL="http://localhost:3000"
CATEGORIES="performance,accessibility,best-practices,seo"
OUTPUT_DIR="lighthouse-reports"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="${OUTPUT_DIR}/${TIMESTAMP}"
AUTH=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --base-url=*) BASE_URL="${arg#*=}" ;;
        --category=*) CATEGORIES="${arg#*=}" ;;
        --auth) AUTH=true ;;
        --help)
            echo "Usage: $0 [--base-url=URL] [--category=CATEGORIES] [--auth]"
            echo ""
            echo "  --base-url   Base URL to audit (default: http://localhost:3000)"
            echo "  --category   Comma-separated Lighthouse categories"
            echo "               (default: performance,accessibility,best-practices,seo)"
            echo "  --auth       Include authenticated pages (inventory, transactions, portfolio)"
            echo "               Prompts for email and password to obtain a session cookie."
            exit 0
            ;;
    esac
done

# Public pages: name|path
PAGES=(
    "home|/"
    "sets|/sets"
    "set-detail|/sets/fdn"
    "search|/search?q=lightning+bolt"
    "card-detail|/card/fdn/176"
    "spoilers|/spoilers"
    "login|/auth/login"
)

# Authenticated pages (only included with --auth)
AUTH_PAGES=(
    "inventory|/inventory"
    "transactions|/transactions"
    "portfolio|/portfolio"
)

PRESETS=("mobile" "desktop")

# Verify lighthouse is available
if command -v lighthouse &>/dev/null; then
    LH="lighthouse"
elif npx --yes lighthouse --version &>/dev/null 2>&1; then
    LH="npx --yes lighthouse"
else
    echo "Error: lighthouse not found. Install with: npm install -g lighthouse"
    exit 1
fi

# Verify base URL is reachable
if ! curl -sf --max-time 5 "${BASE_URL}/" >/dev/null 2>&1; then
    echo "Error: ${BASE_URL} is not reachable."
    echo "Start the app first: npm run start:dev"
    exit 1
fi

# Authenticate if --auth flag is set
AUTH_COOKIE=""
EXTRA_HEADERS=""
if [ "${AUTH}" = true ]; then
    echo ""
    echo "--- Authentication ---"
    read -rp "Email: " LH_EMAIL
    read -rsp "Password: " LH_PASSWORD
    echo ""

    COOKIE_JAR=$(mktemp)
    trap 'rm -f "${COOKIE_JAR}"' EXIT

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -c "${COOKIE_JAR}" \
        -L --max-redirs 5 \
        -X POST "${BASE_URL}/auth/login" \
        --data-urlencode "username=${LH_EMAIL}" \
        --data-urlencode "password=${LH_PASSWORD}")

    AUTH_COOKIE=$(awk '/authorization/ {print $NF}' "${COOKIE_JAR}" 2>/dev/null || true)

    if [ -z "${AUTH_COOKIE}" ]; then
        echo "Warning: Login failed (HTTP ${HTTP_CODE}). Skipping authenticated pages."
        echo "         Check your credentials and try again."
        AUTH=false
    else
        echo "Authenticated successfully."
        EXTRA_HEADERS="--extra-headers={\"Cookie\":\"authorization=${AUTH_COOKIE}\"}"
        PAGES+=("${AUTH_PAGES[@]}")
    fi
fi

CATEGORY_FLAGS=""
IFS=',' read -ra CATS <<< "${CATEGORIES}"
for cat in "${CATS[@]}"; do
    CATEGORY_FLAGS="${CATEGORY_FLAGS} --only-categories=${cat}"
done

echo ""
echo "Lighthouse Audit — $(date)"
echo "Base URL: ${BASE_URL}"
echo "Categories: ${CATEGORIES}"
echo "Presets: mobile, desktop"
echo "Pages: ${#PAGES[@]}"
echo "Reports: ${REPORT_DIR}/"
echo "==========================================="

total_pass=0
total_fail=0

for preset in "${PRESETS[@]}"; do
    PRESET_DIR="${REPORT_DIR}/${preset}"
    mkdir -p "${PRESET_DIR}"

    SUMMARY_FILE="${PRESET_DIR}/summary.txt"
    CSV_FILE="${PRESET_DIR}/summary.csv"

    # Lighthouse flags per preset
    if [ "${preset}" = "desktop" ]; then
        PRESET_FLAG="--preset=desktop"
    else
        PRESET_FLAG=""
    fi

    # CSV header
    echo "page,url,performance,accessibility,best-practices,seo" > "${CSV_FILE}"

    {
        printf "\n%-16s %5s  %5s  %5s  %5s\n" "PAGE" "PERF" "A11Y" "BP" "SEO"
        printf "%-16s %5s  %5s  %5s  %5s\n" "────────────────" "─────" "─────" "─────" "─────"
    } > "${SUMMARY_FILE}"

    echo ""
    echo "--- $(echo "$preset" | tr '[:lower:]' '[:upper:]') ---"

    for entry in "${PAGES[@]}"; do
        IFS='|' read -r name path <<< "${entry}"
        url="${BASE_URL}${path}"

        echo -n "  ${name}..."

        json_file="${PRESET_DIR}/${name}.json"

        if $LH "${url}" \
            --chrome-flags="--headless --no-sandbox --disable-gpu" \
            --output=json,html \
            --output-path="${PRESET_DIR}/${name}" \
            ${CATEGORY_FLAGS} \
            ${PRESET_FLAG} \
            ${EXTRA_HEADERS} \
            --quiet 2>/dev/null; then

            # Rename outputs (lighthouse appends .report.json/.report.html)
            [ -f "${PRESET_DIR}/${name}.report.json" ] && mv "${PRESET_DIR}/${name}.report.json" "${json_file}"
            [ -f "${PRESET_DIR}/${name}.report.html" ] && mv "${PRESET_DIR}/${name}.report.html" "${PRESET_DIR}/${name}.html"

            # Extract scores from JSON
            scores=$(node -e "
                const r = require('./${json_file}');
                const c = r.categories;
                const s = k => c[k] ? Math.round(c[k].score * 100) : '-';
                console.log([s('performance'), s('accessibility'), s('best-practices'), s('seo')].join(','));
            " 2>/dev/null || echo "-,-,-,-")

            IFS=',' read -r s_perf s_a11y s_bp s_seo <<< "${scores}"

            printf " Perf: %3s  A11y: %3s  BP: %3s  SEO: %3s\n" "${s_perf}" "${s_a11y}" "${s_bp}" "${s_seo}"
            printf "%-16s %5s  %5s  %5s  %5s\n" "${name}" "${s_perf}" "${s_a11y}" "${s_bp}" "${s_seo}" >> "${SUMMARY_FILE}"
            echo "${name},${path},${s_perf},${s_a11y},${s_bp},${s_seo}" >> "${CSV_FILE}"

            total_pass=$((total_pass + 1))
        else
            echo " FAILED"
            printf "%-16s  FAILED\n" "${name}" >> "${SUMMARY_FILE}"
            total_fail=$((total_fail + 1))
        fi
    done
done

# Final summary
echo ""
echo "==========================================="
echo "Audited ${total_pass} pages, ${total_fail} failed"
echo "Reports: ${REPORT_DIR}/"
echo ""

for preset in "${PRESETS[@]}"; do
    echo "--- $(echo "$preset" | tr '[:lower:]' '[:upper:]') scores ---"
    cat "${REPORT_DIR}/${preset}/summary.txt"
    echo ""
done
