ALTER TABLE card
  ADD COLUMN IF NOT EXISTS is_alternative BOOLEAN;

UPDATE card SET is_alternative = false WHERE is_alternative IS NULL;

ALTER TABLE card
  ALTER COLUMN is_alternative SET DEFAULT false,
  ALTER COLUMN is_alternative SET NOT NULL;