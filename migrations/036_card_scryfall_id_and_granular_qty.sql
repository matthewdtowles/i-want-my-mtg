BEGIN;

-- Phase 6.7 (Tier B): Card Kingdom direct pricelist ingest. CK identifies
-- cards by scryfall_id; our cards are keyed by the MTGJSON uuid. Two additive
-- changes:
--
-- 1) card.scryfall_id -- a unique indexed column, NOT the PK. card.id stays
--    the MTGJSON uuid (it is what all prices, user inventory/transactions,
--    every FK, and the public API reference). Backfilled from img_src, which
--    scry builds as '{a}/{b}/{scryfall_id}.jpg' -- a total, reversible
--    function of scryfall_id (verified 1:1 across all 91,316 cards). The
--    backfill is shape-guarded so non-conforming img_src values (e.g. test
--    seeds) stay NULL instead of polluting the unique index; NULLs are
--    allowed and non-conflicting. scry persists scryfall_id directly for
--    cards ingested after this.
--
-- 2) granular_price / granular_price_history gain a nullable qty column for
--    CK's live buy quantity (qty_buying). MTGJSON granular rows carry no
--    quantity; upserts are last-writer-wins (qty = EXCLUDED.qty), so qty is
--    NULL ("unknown") unless the most recent writer provided it -- a stale
--    quantity is worse than none for actionable offers.

ALTER TABLE public.card ADD COLUMN IF NOT EXISTS scryfall_id character varying;

UPDATE public.card
SET scryfall_id = left(split_part(img_src, '/', 3), 36)
WHERE scryfall_id IS NULL
  AND img_src ~ '^[0-9a-f]/[0-9a-f]/[0-9a-f-]{36}\.jpg$';

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_scryfall_id ON public.card (scryfall_id);

ALTER TABLE public.granular_price ADD COLUMN IF NOT EXISTS qty integer;
ALTER TABLE public.granular_price_history ADD COLUMN IF NOT EXISTS qty integer;

COMMIT;
