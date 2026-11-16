-- Filtering cards by format and legality (card search, the price movers) could only
-- use the primary key (card_id, format), so it looked up each candidate card's row
-- one at a time. On prod that made the Commander-legal mythic movers take 4s against
-- 0.8s for mythics alone. This index reads every card with a format's status as one
-- range.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_legality_format_status_card ON legality (format, status, card_id);
COMMIT;
