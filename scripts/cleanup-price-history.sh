#!/bin/bash

# Price History Cleanup Script
# Retention Strategy:
# - Last 7 days: Keep all data (daily snapshots)
# - Days 7-28: Keep only Mondays (weekly snapshots)
# - 28+ days: Keep only 1st of month (monthly snapshots)

set -e  # Exit on error

# Configuration
DB_CONTAINER="ubuntu-postgres-1"
DB_NAME="i_want_my_mtg"
DB_USER="iwmm_pg_user"
LOG_FILE="/var/log/price-history-cleanup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Function to execute PostgreSQL commands
psql_exec() {
    docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "$1"
}

# Start cleanup
log "========================================="
log "Starting price history cleanup"
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
DELETE FROM price_history
WHERE date >= '$FOUR_WEEKS_AGO'::date 
  AND date < '$SEVEN_DAYS_AGO'::date
  AND EXTRACT(DOW FROM date) NOT IN (1);
SELECT COUNT(*);
" | tail -1)

log_success "Deleted $WEEKLY_DELETED rows from weekly retention period"

# Step 2: Delete non-1st-of-month records from monthly retention period (28+ days ago)
log "Cleaning monthly retention period (keeping only 1st of month)..."
MONTHLY_DELETED=$(psql_exec "
DELETE FROM price_history
WHERE date < '$FOUR_WEEKS_AGO'::date
  AND EXTRACT(DAY FROM date) != 1;
SELECT COUNT(*);
" | tail -1)

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

# Check for bloat warnings
DEAD_PCT=$(psql_exec "
SELECT round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2)
FROM pg_stat_user_tables 
WHERE relname = 'price_history';
" | xargs)

if [ ! -z "$DEAD_PCT" ] && (( $(echo "$DEAD_PCT > 20" | bc -l) )); then
    log_warning "Dead tuple percentage is high: ${DEAD_PCT}%. Consider running VACUUM FULL."
fi

# Summary
TOTAL_DELETED=$((WEEKLY_DELETED + MONTHLY_DELETED))
log "========================================="
log_success "Cleanup completed successfully"
log "Total rows deleted: $TOTAL_DELETED"
log "========================================="

exit 0
