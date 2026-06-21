BEGIN;

-- 10.7 (#537): published tournament decklists. A read-only catalog that Scry
-- ingests from external tournament feeds (MTGO challenges, paper events, etc.).
-- Kept separate from the user-owned `deck` tables so ownership queries stay
-- clean; the web app only reads these.
--
-- `format` is plain text (not format_enum) because feed formats are broader than
-- our constructed-format enum (pauper, legacy, vintage, ...). Dedup is by
-- (source, source_uri): re-ingesting the same tournament/deck upserts in place.
--
-- IF NOT EXISTS guards keep this replayable (the migration set re-runs every deploy).

CREATE TABLE IF NOT EXISTS public.published_deck (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    source character varying NOT NULL,
    source_uri character varying NOT NULL,
    tournament_name character varying,
    tournament_date date,
    format character varying,
    archetype character varying,
    player character varying,
    result character varying,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT published_deck_pkey PRIMARY KEY (id),
    CONSTRAINT uq_published_deck_source UNIQUE (source, source_uri)
);

CREATE INDEX IF NOT EXISTS idx_published_deck_format_date
    ON public.published_deck (format, tournament_date DESC);

CREATE TABLE IF NOT EXISTS public.published_deck_card (
    published_deck_id integer NOT NULL,
    card_id character varying NOT NULL,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_sideboard boolean NOT NULL DEFAULT false,
    CONSTRAINT published_deck_card_pkey PRIMARY KEY (published_deck_id, card_id, is_sideboard),
    CONSTRAINT fk_published_deck_card_deck FOREIGN KEY (published_deck_id)
        REFERENCES public.published_deck(id) ON DELETE CASCADE,
    CONSTRAINT fk_published_deck_card_card FOREIGN KEY (card_id)
        REFERENCES public.card(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_published_deck_card_deck_id
    ON public.published_deck_card (published_deck_id);

COMMIT;
