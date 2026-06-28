BEGIN;

-- Push-notification device registration (#556).
--
-- Stores each mobile/web device's push token so notifications and price alerts
-- can later be fanned out to it (Expo/APNs/FCM). One row per push token; the
-- token is unique, so re-registering the same device (e.g. after a fresh login)
-- upserts onto it and can re-point it at the current user. `device_id` is
-- optional client-supplied metadata. Fan-out delivery itself is a follow-up.
--
-- IF NOT EXISTS guards keep this replayable (the migration set re-runs every deploy).

CREATE TABLE IF NOT EXISTS public.notification_device (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    token varchar NOT NULL UNIQUE,
    platform varchar NOT NULL,
    device_id varchar,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT notification_device_pkey PRIMARY KEY (id),
    CONSTRAINT fk_notification_device_user FOREIGN KEY (user_id)
        REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notification_device_user_id
    ON public.notification_device (user_id);

COMMIT;
