BEGIN;

-- Hotfix: production's granular_price / granular_price_history tables were
-- created during the 6.x buylist spike WITHOUT their primary keys. Migration
-- 034 defines those tables with CREATE TABLE IF NOT EXISTS, which is a no-op
-- once the tables already exist -- so it never added the PKs to the pre-existing
-- spike tables. scry's daily price ingest UPSERTs into them with
--   INSERT ... ON CONFLICT (card_id, provider, price_type, finish, condition)
-- which fails with "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification", aborting the entire price update.
--
-- This migration adds the missing primary keys. It is idempotent (re-run on
-- every deploy via run_migrations.sh) and defensive: it de-duplicates any stray
-- rows first so the PK can form (the tables are expected to be empty, since
-- every granular insert has been failing, but a spike may have left rows). Note
-- ADD PRIMARY KEY also sets the key columns NOT NULL automatically.

-- granular_price: current per-vendor offer, one row per series (no date in key)
DELETE FROM public.granular_price a
USING public.granular_price b
WHERE a.ctid < b.ctid
  AND a.card_id = b.card_id
  AND a.provider = b.provider
  AND a.price_type = b.price_type
  AND a.finish = b.finish
  AND a.condition = b.condition;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'granular_price_pkey'
          AND conrelid = 'public.granular_price'::regclass
    ) THEN
        ALTER TABLE public.granular_price
            ADD CONSTRAINT granular_price_pkey
            PRIMARY KEY (card_id, provider, price_type, finish, condition);
    END IF;
END $$;

-- granular_price_history: dated series (date is part of the key)
DELETE FROM public.granular_price_history a
USING public.granular_price_history b
WHERE a.ctid < b.ctid
  AND a.card_id = b.card_id
  AND a.provider = b.provider
  AND a.price_type = b.price_type
  AND a.finish = b.finish
  AND a.condition = b.condition
  AND a.date = b.date;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'granular_price_history_pkey'
          AND conrelid = 'public.granular_price_history'::regclass
    ) THEN
        ALTER TABLE public.granular_price_history
            ADD CONSTRAINT granular_price_history_pkey
            PRIMARY KEY (card_id, provider, price_type, finish, condition, date);
    END IF;
END $$;

COMMIT;
