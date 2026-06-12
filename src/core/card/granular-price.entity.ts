/**
 * A single price point as ingested into the granular store (Phase 6.2):
 * one provider, one retail|buylist type, one finish, one condition, one day.
 * Mirrors a `granular_price` row. Immutable value object, matching `Price`.
 */
export class GranularPrice {
    readonly cardId: string;
    readonly provider: string;
    readonly priceType: string; // 'retail' | 'buylist'
    readonly finish: string; // 'normal' | 'foil' | 'etched'
    readonly condition: string; // 'NM' by convention where the source has no grade
    readonly date: Date;
    readonly price: number | null;
    /** Vendor buy quantity (6.7, CK-direct); null = unknown (e.g. MTGJSON rows). */
    readonly qty: number | null;

    constructor(init: Partial<GranularPrice>) {
        this.cardId = init.cardId;
        this.provider = init.provider;
        this.priceType = init.priceType;
        this.finish = init.finish;
        this.condition = init.condition ?? 'NM';
        this.date = init.date ?? new Date();
        this.price = init.price ?? null;
        this.qty = init.qty ?? null;
    }
}
