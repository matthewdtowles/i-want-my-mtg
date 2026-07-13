/**
 * SQL predicate that selects the most-recent `price` row for a card — the
 * "latest price" join reused across the card, inventory, deck, buy-list and
 * published-deck repositories. Extracted so "latest price" means the same thing
 * on every page and a single edit can't silently drift one of them (A6).
 *
 * The subquery is intentionally correlated; if it becomes a hotspot on large
 * sets, swap the body here for a LATERAL join or a `latest_price` view without
 * touching any call site.
 *
 * @param priceAlias alias of the joined `price` row (e.g. `'prices'` or `'p'`)
 * @param cardAlias  alias of the card row to correlate against (e.g. `'card'` or `'c'`)
 */
export function latestPriceCondition(priceAlias: string, cardAlias: string): string {
    return `${priceAlias}.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = ${cardAlias}.id)`;
}
