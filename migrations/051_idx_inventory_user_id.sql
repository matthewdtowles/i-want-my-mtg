-- Every signed-in page that loads a user's collection filters inventory by user_id,
-- but the table's only index is its primary key (card_id, user_id, foil), which
-- can't serve that filter, so each of those queries read every user's inventory.
-- Measured against 636,000 rows: one set's owned count fell from 6.2ms to 2.7ms.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory (user_id);
COMMIT;
