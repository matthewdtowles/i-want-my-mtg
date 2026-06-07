import { GranularPrice } from 'src/core/card/granular-price.entity';

/**
 * Buylist (sell-to-vendor) policy for Phase 6.3.
 *
 * The card page renders the full per-vendor breakdown; the set page and binder
 * overlay only need the single best number. NM is the only graded condition the
 * granular store carries today (6.2), so "best" is the highest positive NM offer
 * across all finishes and vendors.
 */
export function bestBuylistOffer(offers: GranularPrice[]): number | null {
    const prices = offers
        .filter((o) => o.condition === 'NM' && o.price != null && o.price > 0)
        .map((o) => o.price as number);
    return prices.length ? Math.max(...prices) : null;
}
