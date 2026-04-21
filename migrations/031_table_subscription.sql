-- Subscription table: tracks Stripe subscription state per user.
-- One row per user, created lazily at first checkout. Synced from Stripe webhooks.
BEGIN;

CREATE TABLE IF NOT EXISTS public."subscription" (
    id serial PRIMARY KEY,
    user_id integer NOT NULL UNIQUE,
    stripe_customer_id varchar NOT NULL UNIQUE,
    stripe_subscription_id varchar UNIQUE,
    stripe_price_id varchar,
    status varchar NOT NULL,
    plan varchar,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_subscription_user FOREIGN KEY (user_id) REFERENCES public."users"(id) ON DELETE CASCADE,
    CONSTRAINT CHK_subscription_status CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
    CONSTRAINT CHK_subscription_plan CHECK (plan IS NULL OR plan IN ('monthly', 'annual'))
);

CREATE INDEX IF NOT EXISTS idx_subscription_status ON public."subscription" (status);

COMMIT;
