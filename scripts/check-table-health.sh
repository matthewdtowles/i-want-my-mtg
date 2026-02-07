#!/bin/bash

# Price History Health Check Script
# Monitors table bloat and provides warnings

set -e

DB_CONTAINER="ubuntu-postgres-1"
DB_NAME="i_want_my_mtg"
DB_USER="iwmm_pg_user"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Price History Table Health Check${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Get table statistics
STATS=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F'|' -c "
SELECT 
    n_live_tup,
    n_dead_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2),
    pg_size_pretty(pg_total_relation_size('public.price_history')),
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
")

IFS='|' read -r LIVE_ROWS DEAD_ROWS DEAD_PCT SIZE LAST_VACUUM LAST_AUTOVACUUM <<< "$STATS"

# Display stats
echo "Table Size: $SIZE"
echo "Live Rows: $LIVE_ROWS"
echo "Dead Rows: $DEAD_ROWS"
echo "Dead %: $DEAD_PCT%"
echo "Last Manual VACUUM: ${LAST_VACUUM:-Never}"
echo "Last Auto VACUUM: ${LAST_AUTOVACUUM:-Never}"
echo ""

# Health assessment
HEALTHY=true

if [ ! -z "$DEAD_PCT" ] && (( $(echo "$DEAD_PCT > 20" | bc -l) )); then
    echo -e "${RED}⚠ WARNING: High dead tuple percentage (${DEAD_PCT}%)${NC}"
    echo -e "${YELLOW}  Recommendation: Run 'bash cleanup-price-history.sh' or manual VACUUM${NC}"
    HEALTHY=false
fi

if [ ! -z "$DEAD_ROWS" ] && [ "$DEAD_ROWS" -gt 100000 ]; then
    echo -e "${RED}⚠ WARNING: High dead row count (${DEAD_ROWS})${NC}"
    echo -e "${YELLOW}  Recommendation: Run cleanup script${NC}"
    HEALTHY=false
fi

# Check retention distribution
echo -e "${BLUE}Retention Distribution:${NC}"
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    CASE 
        WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days (daily)'
        WHEN date >= CURRENT_DATE - INTERVAL '28 days' THEN 'Week 2-4 (weekly)'
        ELSE 'Older (monthly)'
    END as retention_period,
    COUNT(*) as row_count,
    MIN(date) as oldest_date,
    MAX(date) as newest_date
FROM price_history
GROUP BY 
    CASE 
        WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days (daily)'
        WHEN date >= CURRENT_DATE - INTERVAL '28 days' THEN 'Week 2-4 (weekly)'
        ELSE 'Older (monthly)'
    END
ORDER BY newest_date DESC;
"

echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✓ Table health: GOOD${NC}"
else
    echo -e "${RED}✗ Table health: NEEDS ATTENTION${NC}"
fi

echo -e "${BLUE}=========================================${NC}"
