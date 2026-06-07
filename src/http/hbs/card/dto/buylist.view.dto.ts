/** A single vendor's current buylist offer for one finish (Phase 6.3). */
export interface BuylistOfferView {
    vendor: string; // display name, e.g. 'Card Kingdom'
    price: string; // formatted, e.g. '$3.50'
    priceRaw: number;
    isBest: boolean; // highest offer for this finish
}

/** Buylist offers for one finish (Normal / Foil), best first. */
export interface BuylistFinishView {
    finish: string; // 'Normal' | 'Foil' | 'Etched'
    best: BuylistOfferView; // highest offer; headlined on the card page
    offers: BuylistOfferView[];
    hasMultiple: boolean; // more than one vendor -> show the "compare" expander
}

/** Card-page buylist section. `hasAny` gates rendering. */
export interface BuylistView {
    finishes: BuylistFinishView[];
    hasAny: boolean;
}
