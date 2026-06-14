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

/** One vendor's usable NM offer for a finish; `isBest` marks the highest for that finish. */
export interface BuylistFinishOffer {
    readonly provider: string;
    readonly price: number;
    readonly isBest: boolean;
}

/** Usable NM offers for one finish, highest first. */
export interface BuylistFinishGroup {
    readonly finish: string; // raw key: 'normal' | 'foil' | 'etched'
    readonly offers: BuylistFinishOffer[];
}

const FINISH_ORDER = ['normal', 'foil', 'etched'];

/**
 * Group usable (NM, positive) buylist offers by finish, highest first, marking
 * the best per finish. Neutral shape shared by the card-page view and the JSON
 * API so both surface the same offers (Phase 6.5 / #530).
 */
export function groupBuylistByFinish(offers: GranularPrice[]): BuylistFinishGroup[] {
    const usable = offers.filter((o) => o.condition === 'NM' && o.price != null && o.price > 0);
    return FINISH_ORDER.map((finish): BuylistFinishGroup | null => {
        const finishOffers = usable
            .filter((o) => o.finish === finish)
            .sort((a, b) => (b.price as number) - (a.price as number));
        if (finishOffers.length === 0) return null;
        const bestPrice = finishOffers[0].price as number;
        return {
            finish,
            offers: finishOffers.map((o) => ({
                provider: o.provider,
                price: o.price as number,
                isBest: (o.price as number) === bestPrice,
            })),
        };
    }).filter((g): g is BuylistFinishGroup => g !== null);
}
