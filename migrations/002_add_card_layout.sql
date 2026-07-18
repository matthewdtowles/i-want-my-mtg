ALTER TABLE card
  ADD COLUMN IF NOT EXISTS layout TEXT;

-- Only backfill + enforce NOT NULL while the column is still nullable. On every
-- later replay the column is already NOT NULL, so this block is skipped and we
-- avoid the whole-table rescan + ACCESS EXCLUSIVE lock that SET NOT NULL takes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'card' AND column_name = 'layout' AND is_nullable = 'YES'
  ) THEN
    UPDATE card SET layout = 'normal' WHERE layout IS NULL;
    ALTER TABLE card
      ALTER COLUMN layout SET DEFAULT 'normal',
      ALTER COLUMN layout SET NOT NULL;
  END IF;
END $$;