BEGIN;

-- Refresh tokens for long-lived mobile/API sessions (#554).
--
-- The API login endpoint issues a short-lived access JWT plus an opaque refresh
-- token; the client exchanges the refresh token at POST /api/v1/auth/refresh for
-- a new access token. Only the SHA-256 hash of the refresh token is stored (like
-- api_key.key_hash) so a DB leak can't be replayed. Tokens are rotated on use
-- (the old row is revoked and a new one issued) and revoked on sign-out /
-- password change. `device_label` is optional client-supplied metadata so a user
-- can tell their sessions apart.
--
-- IF NOT EXISTS guards keep this replayable (the migration set re-runs every deploy).

CREATE TABLE IF NOT EXISTS public.refresh_token (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    token_hash varchar NOT NULL UNIQUE,
    device_label varchar,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT refresh_token_pkey PRIMARY KEY (id),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

-- Active-token lookups by user (revoke-all on password change) skip revoked rows.
CREATE INDEX IF NOT EXISTS idx_refresh_token_user_active
    ON public.refresh_token (user_id) WHERE revoked_at IS NULL;

COMMIT;
