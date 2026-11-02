-- Every card page counts and lists a card's printings by exact name
-- (CardRepository.totalWithName / findWithName). card.name had only the trigram
-- index from 013, which is built for fuzzy search, so each exact-name lookup read
-- far more of card than the handful of matching rows. On 2026-11-01 a crawl of
-- every card page ran these lookups for hours, exhausted the database volume's
-- I/O burst, and every query then queued on disk until pages returned 500s.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_card_name ON card (name);
COMMIT;
