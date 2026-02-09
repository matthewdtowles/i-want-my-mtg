#!/bin/bash

# Emergency: Truncate Price History Table
# USE WITH CAUTION - This deletes ALL data from price_history

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/db-config.sh"
parse_db_args "$@" || exit 0

echo -e "${RED}=========================================${NC}"
echo -e "${RED}⚠  DANGER: TRUNCATE PRICE HISTORY TABLE${NC}"
echo -e "${RED}=========================================${NC}"
echo ""
echo -e "${YELLOW}Container: ${DB_CONTAINER} | DB: ${DB_NAME} | User: ${DB_USER}${NC}"
echo -e "${YELLOW}This will DELETE ALL DATA from the price_history table.${NC}"
echo -e "${YELLOW}This action CANNOT be undone.${NC}"
echo ""

# Show current table size
CURRENT_SIZE=$(psql_exec "
SELECT pg_size_pretty(pg_total_relation_size('public.price_history'));
" | xargs)

CURRENT_ROWS=$(psql_exec "
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

psql_exec "TRUNCATE TABLE price_history;"

# Verify
NEW_SIZE=$(psql_exec "
SELECT pg_size_pretty(pg_total_relation_size('public.price_history'));
" | xargs)

echo ""
echo -e "${GREEN}✓ Table truncated successfully${NC}"
echo "New table size: $NEW_SIZE"
echo ""
echo -e "${YELLOW}Remember to reload your price history data!${NC}"
