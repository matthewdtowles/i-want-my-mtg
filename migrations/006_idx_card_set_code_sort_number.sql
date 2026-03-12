BEGIN;
CREATE INDEX IF NOT EXISTS idx_card_set_code_sort_number ON CARD (set_code, sort_number);
COMMIT;