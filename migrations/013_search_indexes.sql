BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_card_name_trgm ON card USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_set_name_trgm ON set USING gin (name gin_trgm_ops);
COMMIT;
