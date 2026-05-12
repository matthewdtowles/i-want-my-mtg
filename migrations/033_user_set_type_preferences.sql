-- User-controlled set-type filter for browse/search views.
-- NULL means "use the default filter" (the existing set.is_main behavior).
-- An array means "show only these set types".
BEGIN;

ALTER TABLE public."users"
    ADD COLUMN IF NOT EXISTS included_set_types text[];

COMMIT;
