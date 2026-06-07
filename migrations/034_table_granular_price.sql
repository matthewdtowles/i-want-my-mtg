BEGIN;

-- Phase 6.2: granular price-data store. Holds every provider's price as
-- ingested -- retail AND buylist, per finish, per condition -- instead of the
-- single averaged normal/foil value the `price` table keeps. scry (scry#14)
-- populates these and derives the existing averaged `price` from the same
-- ingest pass, so nothing downstream changes. 6.3 reads `granular_price`
-- directly for per-vendor buylist display.
--
-- Mirrors the price / price_history split:
--   granular_price          -- current per-vendor offer, one row per series
--                              (no date in the PK). Read by the card page.
--   granular_price_history  -- dated series, retention-bounded (scry prunes it
--                              daily->weekly->monthly). Source for trends.
--
-- condition is NOT NULL DEFAULT 'NM': a bare MTG price means Near Mint by
-- convention and MTGJSON has no condition concept. Keeping it in the key (vs a
-- NULL that compares distinct) keeps a plain natural-key PK. Other grades, if a
-- source ever provides them, get their own rows (ROADMAP 6.6). Buy quantity is
-- deferred to Tier B (Card Kingdom direct) and modelled then -- no qty column.
CREATE TABLE IF NOT EXISTS public.granular_price (
    card_id    character varying NOT NULL,
    provider   character varying NOT NULL,
    price_type character varying NOT NULL,
    finish     character varying NOT NULL,
    condition  character varying NOT NULL DEFAULT 'NM',
    date       date NOT NULL,
    price      numeric NOT NULL,
    CONSTRAINT granular_price_pkey
        PRIMARY KEY (card_id, provider, price_type, finish, condition),
    CONSTRAINT granular_price_card_fk
        FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.granular_price_history (
    card_id    character varying NOT NULL,
    provider   character varying NOT NULL,
    price_type character varying NOT NULL,
    finish     character varying NOT NULL,
    condition  character varying NOT NULL DEFAULT 'NM',
    date       date NOT NULL,
    price      numeric NOT NULL,
    CONSTRAINT granular_price_history_pkey
        PRIMARY KEY (card_id, provider, price_type, finish, condition, date),
    CONSTRAINT granular_price_history_card_fk
        FOREIGN KEY (card_id) REFERENCES public.card(id) ON DELETE CASCADE
);

COMMIT;
