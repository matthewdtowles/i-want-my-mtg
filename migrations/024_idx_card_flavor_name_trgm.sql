BEGIN;
CREATE INDEX IF NOT EXISTS idx_card_flavor_name_trgm ON card USING gin (flavor_name gin_trgm_ops);
COMMIT;
