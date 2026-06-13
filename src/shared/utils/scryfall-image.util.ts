/**
 * Builds the Scryfall image path tail `{a}/{b}/{scryfallId}.jpg` from a
 * Scryfall id, where `a`/`b` are its first two characters. TS mirror of scry's
 * `Card::build_scryfall_image_path` (src/card/domain/card.rs); the two must
 * agree, since the web renders `${BASE_IMAGE_URL}/${size}/front/${tail}` and
 * this is the path scry once stored in the (now dropped) `card.img_src` column.
 *
 * Returns `''` for a missing id (every card has a scryfall_id in practice -
 * migration 036 backfilled all rows and scry persists it - but the column is
 * typed nullable).
 */
export function buildScryfallImagePath(scryfallId?: string | null): string {
    return scryfallId ? `${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg` : '';
}
