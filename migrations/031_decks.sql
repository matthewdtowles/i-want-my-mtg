BEGIN;

--
-- deck: user-owned deck of cards
-- format is nullable; null = freestyle (no legality enforcement)
--
CREATE TABLE IF NOT EXISTS public.deck (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name CHARACTER VARYING NOT NULL,
    format public.format_enum,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deck_user_id ON deck (user_id);

--
-- deck_card: cards in a deck (main deck or sideboard)
--
CREATE TABLE IF NOT EXISTS public.deck_card (
    deck_id INTEGER NOT NULL REFERENCES deck(id) ON DELETE CASCADE,
    card_id CHARACTER VARYING NOT NULL REFERENCES card(id) ON DELETE CASCADE,
    is_sideboard BOOLEAN NOT NULL DEFAULT false,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (deck_id, card_id, is_sideboard)
);

CREATE INDEX IF NOT EXISTS idx_deck_card_deck_id ON deck_card (deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_card_card_id ON deck_card (card_id);

COMMIT;
