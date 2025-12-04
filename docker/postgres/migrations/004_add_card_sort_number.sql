ALTER TABLE card 
  ADD COLUMN IF NOT EXISTS sort_number TEXT;

UPDATE card SET sort_number = '~~' WHERE sort_number IS NULL;

ALTER TABLE card
  ALTER COLUMN sort_number SET DEFAULT '~~',
  ALTER COLUMN sort_number SET NOT NULLwm;