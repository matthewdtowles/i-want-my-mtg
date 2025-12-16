ALTER TABLE "set"
  ADD COLUMN IF NOT EXISTS total_size INTEGER;

UPDATE "set" SET total_size = 0 WHERE total_size IS NULL;

ALTER TABLE "set"
  ALTER COLUMN total_size SET DEFAULT 0,
  ALTER COLUMN total_size SET NOT NULL;