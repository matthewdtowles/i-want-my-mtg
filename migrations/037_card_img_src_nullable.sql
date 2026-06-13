BEGIN;

-- Phase 6.8b (step 1 of 2): make card.img_src nullable.
--
-- img_src is redundant derived data on its way out: scry stored it as
-- '{a}/{b}/{scryfall_id}.jpg', and the web now derives that path from
-- card.scryfall_id at read time (6.8a) instead of reading this column. The
-- column is dropped in a later migration, but only after scry has stopped
-- writing it and that binary is live in prod (the drop can't precede the
-- binary, or the still-writing card upsert would fail on a missing column).
--
-- Relaxing NOT NULL first is the prerequisite for that scry change: it lets
-- scry's card upsert omit img_src without violating the constraint. Safe and
-- inert on its own - scry keeps writing img_src until its next release.

ALTER TABLE public.card ALTER COLUMN img_src DROP NOT NULL;

COMMIT;
