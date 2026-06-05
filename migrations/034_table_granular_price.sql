BEGIN;

-- Phase 6.2: granular price-data store. Holds every provider's price as
-- ingested -- retail AND buylist, per finish, per condition -- instead of the
-- single averaged normal/foil value the `price` table keeps. scry (scry#14)
-- populates this and derives the existing averaged `price` from it in the same
-- ingest pass, so nothing downstream changes. 6.3 reads it directly for
-- per-vendor buylist display.
--
-- condition is NOT NULL DEFAULT 'NM': a bare MTG price means Near Mint by
-- convention, MTGJSON has no condition concept, and keeping the column out of
-- the key as a NULL would let same-key rows accumulate as daily duplicates
-- (NULLs compare distinct), corrupting the derived average. NM-default keeps a
-- plain natural-key PK. Other grades, if a source ever provides them, get
-- their own rows. See ROADMAP 6.6 for the eventual grade-vocabulary decision.
CREATE TABLE IF NOT EXISTS public.granular_price (
    card_id    character varying NOT NULL,
    provider   character varying NOT NULL,
    price_type character varying NOT NULL,
    finish     character varying NOT NULL,
    condition  character varying NOT NULL DEFAULT 'NM',
    date       date NOT NULL,
    price      numeric,
    qty        integer,
    CONSTRAINT granular_price_pkey
        PRIMARY KEY (card_id, provider, price_type, finish, condition, date),
    CONSTRAINT granular_price_card_fk
        FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE
);

COMMIT;
