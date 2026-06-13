BEGIN;

-- Phase 6.5: per-user buy-list (want-list). A user's list of cards they intend
-- to buy, used on its own (/buy-list) and by the cash-vs-store-credit optimizer
-- (PR2): store credit applied against this list at retail.
--
-- Grain mirrors inventory exactly (card + finish + quantity, owned by a user),
-- so the optimizer can price normal vs foil and match against inventory cleanly.
-- Composite natural key (user_id, card_id, foil) — no surrogate id, like
-- inventory. created_at orders the list newest-first.

CREATE TABLE IF NOT EXISTS public.buy_list (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id CHARACTER VARYING NOT NULL REFERENCES card(id) ON DELETE CASCADE,
    foil BOOLEAN NOT NULL DEFAULT false,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, card_id, foil)
);

CREATE INDEX IF NOT EXISTS idx_buy_list_user_id ON buy_list (user_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_card_id ON buy_list (card_id);

COMMIT;
