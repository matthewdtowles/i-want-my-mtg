BEGIN;

ALTER TABLE public.sealed_product ADD COLUMN IF NOT EXISTS tcgplayer_product_id CHARACTER VARYING;

COMMIT;
