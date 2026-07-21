ALTER TABLE "set" ADD COLUMN IF NOT EXISTS is_main BOOLEAN;
-- Guarded: the migration set is replayed every deploy, and base_size is a
-- derived column that scry zeroes on every set ingest and only restores in
-- post-ingest. Unguarded, a deploy landing in that window re-derived
-- is_main = false for every set and emptied the main-sets listing. After the
-- first run the column is NOT NULL, so this is a clean no-op.
UPDATE "set" SET is_main = (base_size > 0) WHERE is_main IS NULL;
ALTER TABLE "set" ALTER COLUMN is_main SET DEFAULT true, ALTER COLUMN is_main SET NOT NULL;
