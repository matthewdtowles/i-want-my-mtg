-- Cross-repo S1 (scry#35, scry PR #43): persist card.language so scry's
-- post-ingest-prune of foreign unpriced cards works as a standalone process.
--
-- Scry previously tracked foreign-card candidates in memory during ingest;
-- PR scry#43 makes it persist `language` on every card upsert and prune by
-- querying `card LEFT JOIN price ... WHERE language NOT IN ('', 'English')`.
-- This repo owns the schema, so the real column lands here; the column shape
-- (VARCHAR(32) NOT NULL DEFAULT 'English') matches scry's test fixture and PR
-- exactly.
--
-- DEFAULT 'English' means every pre-existing row is conservatively treated as
-- non-foreign until the next ingest rewrites it — no surprise deletions on
-- first deploy.
--
-- The web app deliberately does not map this column (CardOrmEntity unchanged):
-- it is scry-owned operational data, like the rest of the ingest bookkeeping.
--
-- Ordering: this migration must be live before a web deploy pulls a scry image
-- containing scry#43. The standard deploy order already guarantees that —
-- migrations run before setup-cron.sh extracts the new binary — but the
-- migration existing first keeps the scry-first/web-second release rule safe.
--
-- Idempotent (IF NOT EXISTS) so the untracked migration set stays replayable.

ALTER TABLE public.card
    ADD COLUMN IF NOT EXISTS language character varying(32) NOT NULL DEFAULT 'English';
