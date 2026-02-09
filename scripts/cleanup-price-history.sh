#!/bin/bash

# Price History Cleanup Script
# Retention Strategy:
# - Last 7 days: Keep all data (daily snapshots)
# - Days 7-28: Keep only Mondays (weekly snapshots)
# - 28+ days: Keep only 1st of month (monthly snapshots)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/db-config.sh"
parse_db_args "$@" || exit 0

LOG_FILE="${LOG_FILE:-$PROJECT_DIR/logs/price-history-cleanup.log}"

# Ensure log directory exists and is writable
LOG_DIR="$(dirname "$LOG_FILE")"
if ! mkdir -p "$LOG_DIR" 2>/dev/null || [ ! -w "$LOG_DIR" ]; then
    echo -e "${YELLOW}Warning: Cannot write to $LOG_DIR, logging to stdout only${NC}"
    LOG_FILE="/dev/null"
fi

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Start cleanup
log "========================================="
log "Starting price history cleanup"
log "Container: ${DB_CONTAINER} | DB: ${DB_NAME} | User: ${DB_USER}"
log "========================================="

# Get stats before cleanup
log "Fetching table stats before cleanup..."
BEFORE_STATS=$(psql_exec "
SELECT 
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    pg_size_pretty(pg_total_relation_size('public.price_history')) AS total_size
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
")

log "Before cleanup: $BEFORE_STATS"

# Calculate date cutoffs
SEVEN_DAYS_AGO=$(date -d '7 days ago' '+%Y-%m-%d')
FOUR_WEEKS_AGO=$(date -d '28 days ago' '+%Y-%m-%d')

log "Retention cutoffs:"
log "  - Daily retention (keep all): After $SEVEN_DAYS_AGO"
log "  - Weekly retention (Mondays only): $FOUR_WEEKS_AGO to $SEVEN_DAYS_AGO"
log "  - Monthly retention (1st only): Before $FOUR_WEEKS_AGO"

# Step 1: Delete non-Monday records from weekly retention period (7-28 days ago)
log "Cleaning weekly retention period (keeping only Mondays)..."
WEEKLY_DELETED=$(psql_exec "
WITH deleted AS (
    DELETE FROM price_history
    WHERE date >= '$FOUR_WEEKS_AGO'::date 
      AND date < '$SEVEN_DAYS_AGO'::date
      AND EXTRACT(DOW FROM date) NOT IN (1)
    RETURNING 1
)
SELECT COUNT(*) FROM deleted;
" | xargs)

log_success "Deleted $WEEKLY_DELETED rows from weekly retention period"

# Step 2: Delete non-1st-of-month records from monthly retention period (28+ days ago)
log "Cleaning monthly retention period (keeping only 1st of month)..."
MONTHLY_DELETED=$(psql_exec "
WITH deleted AS (
    DELETE FROM price_history
    WHERE date < '$FOUR_WEEKS_AGO'::date
      AND EXTRACT(DAY FROM date) != 1
    RETURNING 1
)
SELECT COUNT(*) FROM deleted;
" | xargs)

log_success "Deleted $MONTHLY_DELETED rows from monthly retention period"

# Step 3: Run VACUUM ANALYZE to reclaim space
log "Running VACUUM ANALYZE to reclaim space and update statistics..."
psql_exec "VACUUM ANALYZE price_history;" > /dev/null 2>&1
log_success "VACUUM ANALYZE completed"

# Get stats after cleanup
log "Fetching table stats after cleanup..."
AFTER_STATS=$(psql_exec "
SELECT 
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    pg_size_pretty(pg_total_relation_size('public.price_history')) AS total_size
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
")

log "After cleanup: $AFTER_STATS"

# Check for bloat warnings — threshold evaluated in SQL to avoid bc dependency
HIGH_DEAD_PCT=$(psql_exec "
SELECT CASE 
    WHEN round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 20 
    THEN 1 ELSE 0 END
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
" | xargs)

DEAD_PCT=$(psql_exec "
SELECT round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2)
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
" | xargs)

if [ "$HIGH_DEAD_PCT" = "1" ]; then
    log_warning "Dead tuple percentage is high: ${DEAD_PCT}%. Consider running VACUUM FULL."
fi

# Summary
TOTAL_DELETED=$((WEEKLY_DELETED + MONTHLY_DELETED))
log "========================================="
log_success "Cleanup completed successfully"
log "Total rows deleted: $TOTAL_DELETED"
log "========================================="

exit 0
