BEGIN;

-- Replace card purchase URLs (which Scry was populating with mtgjson.com
-- redirect links) with TCGPlayer product IDs. The web app builds the
-- destination URL from the ID at render time and wraps it in our Impact
-- affiliate link, so MTGJSON no longer gets attribution credit for clicks.
ALTER TABLE public.card ADD COLUMN IF NOT EXISTS tcgplayer_product_id CHARACTER VARYING;
ALTER TABLE public.card ADD COLUMN IF NOT EXISTS tcgplayer_etched_product_id CHARACTER VARYING;
ALTER TABLE public.card DROP COLUMN IF EXISTS purchase_url_tcgplayer;
ALTER TABLE public.card DROP COLUMN IF EXISTS purchase_url_tcgplayer_etched;

-- Sealed products already store tcgplayer_product_id; the redirect URL
-- column is now dead weight.
ALTER TABLE public.sealed_product DROP COLUMN IF EXISTS purchase_url_tcgplayer;

COMMIT;
