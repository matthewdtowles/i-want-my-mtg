/**
 * Vendor metadata for buylist display (Phase 6.3).
 *
 * Separates the data *provider* (where a number came from) from a *vendor*
 * (somewhere a user can actually sell to). Kept as a code-level constant on
 * purpose: only Card Kingdom and Cardsphere are real sell-to vendors today, and
 * the richer rules the optimizer needs (store-credit %, min/max, accepted
 * conditions) are deferred to the 6.5 DB `vendor` table. See ROADMAP 6.5.
 */
export interface VendorInfo {
    /** Provider key as stored in granular_price.provider. */
    readonly key: string;
    readonly displayName: string;
    /** Whether a user can actually sell to them (vs. just a price source). */
    readonly sellable: boolean;
}

export const VENDORS: Record<string, VendorInfo> = {
    cardkingdom: { key: 'cardkingdom', displayName: 'Card Kingdom', sellable: true },
    cardsphere: { key: 'cardsphere', displayName: 'Cardsphere', sellable: true },
};

/** Human label for a provider key; falls back to the raw key if unknown. */
export function vendorDisplayName(provider: string): string {
    return VENDORS[provider]?.displayName ?? provider;
}

/**
 * Public buylist-search URL on the vendor's own site for a card, so a user can
 * act on an offer (6.4). Plain links only — no partner/affiliate attribution.
 * Null when we have no known URL pattern for the provider.
 */
export function vendorBuylistUrl(provider: string, cardName: string): string | null {
    if (!cardName) return null;
    switch (provider) {
        case 'cardkingdom':
            return (
                'https://www.cardkingdom.com/purchasing/mtg_singles' +
                `?filter%5Bsearch%5D=mtg_advanced&filter%5Bname%5D=${encodeURIComponent(cardName)}`
            );
        default:
            return null;
    }
}
