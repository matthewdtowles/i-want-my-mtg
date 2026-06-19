BEGIN;

-- 10.10: drop the dead granular price store; CK-direct is the only granular source.
--
-- granular_price_history was write-only -- no reader in the web app, API, or scry
-- (see ROADMAP 10.10 / scry#22) -- so it's removed entirely, along with its
-- scry-side writes + retention. The web app only reads granular_price
-- WHERE price_type='buylist' (Card Kingdom), which CK-direct supplies live (with qty).
--
-- Also purge the orphaned granular_price rows the MTGJSON pass wrote: all retail
-- rows (never read) plus the stale CK buylist rows (CK-direct's coverage gap;
-- ~88% of the MTGJSON-only rows were days/weeks old). CK-direct rows carry a live
-- `qty`, so `qty IS NULL` cleanly selects the MTGJSON-sourced rows; the next
-- nightly CK-direct run repopulates anything still live.
--
-- Idempotent (IF EXISTS) so the untracked migration set stays replayable. Must run
-- only once the cut scry binary (which no longer writes either) is the one ingesting
-- -- the web deploy migrates before extracting the new binary, so that holds.

DROP TABLE IF EXISTS public.granular_price_history;

DELETE FROM public.granular_price WHERE qty IS NULL;

COMMIT;
