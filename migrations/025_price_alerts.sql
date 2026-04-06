BEGIN;

CREATE TABLE IF NOT EXISTS public.price_alert (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id CHARACTER VARYING NOT NULL REFERENCES card(id) ON DELETE CASCADE,
    increase_pct NUMERIC(5,2),
    decrease_pct NUMERIC(5,2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alert_user_id ON price_alert (user_id);
CREATE INDEX IF NOT EXISTS idx_price_alert_card_id ON price_alert (card_id);
CREATE INDEX IF NOT EXISTS idx_price_alert_active ON price_alert (is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.price_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id CHARACTER VARYING NOT NULL REFERENCES card(id) ON DELETE CASCADE,
    alert_id INTEGER REFERENCES price_alert(id) ON DELETE SET NULL,
    direction VARCHAR(8) NOT NULL CHECK (direction IN ('increase', 'decrease')),
    old_price NUMERIC(10,2) NOT NULL,
    new_price NUMERIC(10,2) NOT NULL,
    change_pct NUMERIC(5,2) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_notification_user_id ON price_notification (user_id);
CREATE INDEX IF NOT EXISTS idx_price_notification_created_at ON price_notification (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_notification_unread ON price_notification (user_id, is_read) WHERE is_read = false;

COMMIT;
