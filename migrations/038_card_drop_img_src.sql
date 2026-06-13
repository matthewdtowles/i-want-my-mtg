BEGIN;

-- Phase 6.8b: drop card.img_src (final step of the 6.8 sequence).
--
-- img_src was redundant derived data: scry stored it as
-- '{a}/{b}/{scryfall_id}.jpg', and the web now derives that path from
-- card.scryfall_id at read time (6.8a) instead of reading this column.
-- Migration 037 made the column nullable; scry then stopped writing it (scry
-- 5.13.1, the no-img_src binary). This drop is the last step.
--
-- Safe ordering: a web deploy runs migrations BEFORE setup-cron.sh extracts the
-- scry binary, and scry:latest is the no-img_src binary, so the column and a
-- still-writing binary never coexist. IF EXISTS keeps this re-runnable (the
-- migration set is replayed on every deploy and in integration tests).
--
-- Migrations 036 (img_src -> scryfall_id backfill) and 037 (ALTER COLUMN
-- img_src) are guarded with column-existence checks so they no-op cleanly once
-- this drop has run.

ALTER TABLE public.card DROP COLUMN IF EXISTS img_src;

COMMIT;
