BEGIN;

-- 10.4: deck building (MVP). A user's decks plus the cards in each.
--
-- `deck` has a generated id (decks need a stable id for URLs + the join) and a
-- nullable `format` (a deck need not target a constructed format). `deck_card`
-- is the join, keyed by (deck_id, card_id, is_sideboard) so the same card can
-- sit in both the maindeck and sideboard as separate rows. Quantity per row.
--
-- IF NOT EXISTS guards keep this replayable (the migration set re-runs every
-- deploy).

CREATE TABLE IF NOT EXISTS public.deck (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    name character varying NOT NULL,
    format public.format_enum,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT deck_pkey PRIMARY KEY (id),
    CONSTRAINT fk_deck_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deck_user_id ON public.deck (user_id);

CREATE TABLE IF NOT EXISTS public.deck_card (
    deck_id integer NOT NULL,
    card_id character varying NOT NULL,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_sideboard boolean NOT NULL DEFAULT false,
    CONSTRAINT deck_card_pkey PRIMARY KEY (deck_id, card_id, is_sideboard),
    CONSTRAINT fk_deck_card_deck FOREIGN KEY (deck_id)
        REFERENCES public.deck(id) ON DELETE CASCADE,
    CONSTRAINT fk_deck_card_card FOREIGN KEY (card_id)
        REFERENCES public.card(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deck_card_deck_id ON public.deck_card (deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_card_card_id ON public.deck_card (card_id);

COMMIT;
