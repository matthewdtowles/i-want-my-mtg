-- Cross-repo (scry#67): persist card.last_seen / sealed_product.last_seen so
-- scry can delete rows MTGJSON no longer publishes.
--
-- MTGJSON re-issues a card under a NEW uuid when it corrects preview-season
-- data. Scry upserts on that uuid, so the superseded row is never touched again
-- and survives forever. In scry#67 a spoiler-era "The Very Hungry Archaic" sat
-- at Secrets of Strixhaven #168 long after MTGJSON had replaced it with
-- Wildgrowth Archaic, and because it carried in_main = false it became the
-- lowest non-main number in the set -- which is the boundary scry's
-- fix_main_classification uses. Every main card above 168 was demoted, so the
-- set's browse listing stopped at 168 instead of 281.
--
-- Absence from the feed is the only evidence such a row is dead, so scry stamps
-- this column on every row it finds during an ingest and, in post-ingest prune,
-- deletes whatever it did not stamp. DATE rather than a timestamp: one ingest
-- is one calendar day's worth of truth, and scry fixes the date once per run
-- (utils::clock::today()) so a run crossing UTC midnight cannot split its own
-- writes across two dates.
--
-- Deliberately NULLable with no default. Existing rows read as NULL, which the
-- sweep treats as unseen, so the first full ingest after this deploy stamps
-- every live row and removes the accumulated orphans in the same pass. Nothing
-- is deleted before that: the sweep refuses to run unless the run proved it
-- covered the catalog (every set holding cards delivered a batch, and rows
-- stamped equals rows carrying today's date).
--
-- The web app deliberately does not map these columns: like card.language in
-- migration 047, this is scry-owned ingest bookkeeping.
--
-- Ordering: this migration must be live before a web deploy pulls a scry image
-- containing the scry#67 change. The standard deploy order already guarantees
-- that -- migrations run before setup-cron.sh extracts the new binary.
--
-- Idempotent (IF NOT EXISTS) so the untracked migration set stays replayable.

BEGIN;

ALTER TABLE public.card
    ADD COLUMN IF NOT EXISTS last_seen DATE;

ALTER TABLE public.sealed_product
    ADD COLUMN IF NOT EXISTS last_seen DATE;

COMMIT;
