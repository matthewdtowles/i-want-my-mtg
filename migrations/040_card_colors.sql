BEGIN;

-- 10.2: add card.colors for the portfolio "By Color" breakdown.
--
-- Stores a card's color identity (MTGJSON `colorIdentity`) as a text array of
-- single-letter codes, e.g. {W,U}; an empty array {} is colorless. Scry writes
-- this going forward; existing rows read NULL until the next full ingest, which
-- the breakdown query treats the same as colorless.
--
-- Nullable, no default: NULL means "not yet ingested", distinct from the empty
-- array a re-ingested colorless card gets. text[] lets the breakdown use array
-- containment (colors @> ARRAY['W','U']) for the superset color filter and
-- unnest(colors) for per-color slices.
--
-- Guarded with IF NOT EXISTS so the untracked migration set stays replayable
-- across deploys.
ALTER TABLE public.card ADD COLUMN IF NOT EXISTS colors text[];

COMMIT;
