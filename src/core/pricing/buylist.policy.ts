import { GranularPrice } from 'src/core/card/granular-price.entity';

/**
 * Buylist (sell-to-vendor) policy for Phase 6.3.
 *
 * The card page renders the full per-vendor breakdown; the set page and binder
 * overlay only need the single best offer. NM is the only graded condition the
 * granular store carries today (6.2), so "best" is the highest positive NM offer
 * across all finishes and vendors. Returns the whole offer (not just the price)
 * so callers can show which finish it is for when it is not the default normal.
 */
export function bestBuylistOffer(offers: GranularPrice[]): GranularPrice | null {
    return offers
        .filter((o) => o.condition === 'NM' && o.price != null && o.price > 0)
        .reduce<GranularPrice | null>(
            (best, o) => (best === null || (o.price as number) > (best.price as number) ? o : best),
            null
        );
}
