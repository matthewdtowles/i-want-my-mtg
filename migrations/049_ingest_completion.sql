-- Cross-repo (scry): record which MTGJSON price build a *complete* ingest wrote.
--
-- The hourly cron gate (`scry has-new-prices`) used to compare MTGJSON's build
-- date with max(price.date). But a failed ingest still writes prices: on
-- 2026-09-25 the AllPrintings.json download stalled mid-stream, the card ingest
-- failed, and the price ingest after it succeeded. The gate then read "already
-- current" for the rest of the day, so the failed run was never retried, and set
-- price rollups, price alerts, and portfolio summaries were skipped until the
-- next day's build.
--
-- scry now writes one row here as the last step of a full ingest in which every
-- step succeeded, and the gate compares against this table instead of price.
-- A partial failure leaves no row, so the next hourly check retries it.
--
-- The seed marks the last finished build as complete so the first hourly check
-- after this deploy does not re-run a finished ingest (and re-send its price
-- alerts). It reads set_price_history rather than price because only a
-- successful ingest writes it (post-ingest updates are skipped on failure), and
-- its date is the price build date (MAX(price.date) per set), not the clock -
-- so a deploy on a day whose ingest failed partway does not bless that build.
-- It only runs while the table is empty: migrations replay on every deploy.
--
-- Ordering: this migration must be live before a web deploy pulls a scry image
-- that reads it. The standard deploy order already guarantees that --
-- migrations run before setup-cron.sh extracts the new binary.
--
-- Idempotent so the untracked migration set stays replayable.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ingest_completion (
    price_date DATE PRIMARY KEY,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ingest_completion (price_date)
SELECT max(date) FROM public.set_price_history
WHERE NOT EXISTS (SELECT 1 FROM public.ingest_completion)
HAVING max(date) IS NOT NULL;

COMMIT;
