/**
 * Builds the Scryfall image path tail `{a}/{b}/{scryfallId}.jpg` from a
 * Scryfall id, where `a`/`b` are its first two characters. TS mirror of scry's
 * `Card::build_scryfall_image_path` (src/card/domain/card.rs); the two must
 * agree, since the web renders `${BASE_IMAGE_URL}/${size}/front/${tail}` and
 * this is exactly the value scry stored in `card.img_src`.
 */
export function buildScryfallImagePath(scryfallId: string): string {
    return `${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
}

/**
 * Resolves a card's image path tail, deriving it from `scryfallId` and falling
 * back to a stored `imgSrc` only while a row still lacks a scryfall_id (cards
 * ingested by the pre-6.7 scry binary, until the next full ingest backfills
 * them). Once scryfall_id is guaranteed populated, the `img_src` column - and
 * this fallback - are removed (ROADMAP 6.8b).
 */
export function cardImageTail(scryfallId?: string | null, imgSrc?: string | null): string {
    return scryfallId ? buildScryfallImagePath(scryfallId) : (imgSrc ?? '');
}
