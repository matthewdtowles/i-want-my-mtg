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
    /**
     * Store-credit bonus as a fraction (0.30 = +30%) — the default used by the
     * cash-vs-credit optimizer (6.5). The real rate fluctuates and varies by
     * promotion, so the optimizer page lets the user override it; this is just
     * a sensible starting point. Code-level until a DB `vendor` table lands.
     */
    readonly storeCreditBonus: number;
}

export const VENDORS: Record<string, VendorInfo> = {
    cardkingdom: {
        key: 'cardkingdom',
        displayName: 'Card Kingdom',
        sellable: true,
        storeCreditBonus: 0.3,
    },
    cardsphere: {
        key: 'cardsphere',
        displayName: 'Cardsphere',
        sellable: true,
        storeCreditBonus: 0,
    },
};

/** Default store-credit bonus for the optimizer (Card Kingdom — the one sell-to vendor today). */
export const DEFAULT_STORE_CREDIT_BONUS = VENDORS.cardkingdom.storeCreditBonus;

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
