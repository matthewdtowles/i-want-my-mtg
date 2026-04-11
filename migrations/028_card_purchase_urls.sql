BEGIN;

ALTER TABLE public.card ADD COLUMN IF NOT EXISTS purchase_url_tcgplayer CHARACTER VARYING;
ALTER TABLE public.card ADD COLUMN IF NOT EXISTS purchase_url_tcgplayer_etched CHARACTER VARYING;

COMMIT;
