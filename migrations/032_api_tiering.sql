-- API tiering: separate subscription model + API keys + per-user daily usage counters.
-- Limits apply per-user (not per-key) so multiple keys can't be used to game the quota.
BEGIN;

CREATE TABLE IF NOT EXISTS public."api_subscription" (
    id serial PRIMARY KEY,
    user_id integer NOT NULL UNIQUE,
    tier varchar NOT NULL DEFAULT 'free',
    stripe_customer_id varchar UNIQUE,
    stripe_subscription_id varchar UNIQUE,
    stripe_price_id varchar,
    status varchar,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_api_subscription_user FOREIGN KEY (user_id) REFERENCES public."users"(id) ON DELETE CASCADE,
    CONSTRAINT CHK_api_subscription_tier CHECK (tier IN ('free', 'developer', 'business')),
    CONSTRAINT CHK_api_subscription_status CHECK (status IS NULL OR status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'))
);

CREATE INDEX IF NOT EXISTS idx_api_subscription_status ON public."api_subscription" (status);

CREATE TABLE IF NOT EXISTS public."api_key" (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    key_hash varchar NOT NULL UNIQUE,
    key_prefix varchar(16) NOT NULL,
    name varchar NOT NULL,
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT FK_api_key_user FOREIGN KEY (user_id) REFERENCES public."users"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_key_user_active ON public."api_key" (user_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public."api_usage" (
    user_id integer NOT NULL,
    day date NOT NULL,
    request_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day),
    CONSTRAINT FK_api_usage_user FOREIGN KEY (user_id) REFERENCES public."users"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_usage_day ON public."api_usage" (day);

COMMIT;
