#!/bin/bash

# Emergency: Truncate Price History Table
# USE WITH CAUTION - This deletes ALL data from price_history

set -e

DB_CONTAINER="ubuntu-postgres-1"
DB_NAME="i_want_my_mtg"
DB_USER="iwmm_pg_user"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}=========================================${NC}"
echo -e "${RED}⚠  DANGER: TRUNCATE PRICE HISTORY TABLE${NC}"
echo -e "${RED}=========================================${NC}"
echo ""
echo -e "${YELLOW}This will DELETE ALL DATA from the price_history table.${NC}"
echo -e "${YELLOW}This action CANNOT be undone.${NC}"
echo ""

# Show current table size
CURRENT_SIZE=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT pg_size_pretty(pg_total_relation_size('public.price_history'));
" | xargs)

CURRENT_ROWS=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM price_history;
" | xargs)

echo "Current table size: $CURRENT_SIZE"
echo "Current row count: $CURRENT_ROWS"
echo ""

# Confirmation
read -p "Type 'DELETE ALL DATA' to confirm truncation: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE ALL DATA" ]; then
    echo -e "${GREEN}Aborted. No data was deleted.${NC}"
    exit 0
fi

echo ""
echo -e "${RED}Truncating price_history table...${NC}"

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "TRUNCATE TABLE price_history;"

# Verify
NEW_SIZE=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT pg_size_pretty(pg_total_relation_size('public.price_history'));
" | xargs)

echo ""
echo -e "${GREEN}✓ Table truncated successfully${NC}"
echo "New table size: $NEW_SIZE"
echo ""
echo -e "${YELLOW}Remember to reload your price history data!${NC}"
