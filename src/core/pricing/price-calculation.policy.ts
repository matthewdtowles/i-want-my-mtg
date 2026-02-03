/**
 * Encapsulates pricing business rules.
 * Used by both service layer (for validation/display) and repository layer (for SQL generation).
 */
export class PriceCalculationPolicy {
    /**
     * Returns SQL expression for calculating card value.
     * Centralizes the business rule: "use normal price, fallback to foil if no normal"
     */
    static cardValueExpression(includeFoil: boolean): string {
        return includeFoil
            ? '(COALESCE(p.normal, 0) + COALESCE(p.foil, 0))'
            : 'COALESCE(p.normal, p.foil, 0)';
    }

    /**
     * Returns SQL expression for inventory item value.
     * Business rule: Use foil price if item is foil, otherwise normal price.
     */
    static inventoryItemValueExpression(): string {
        return `CASE WHEN i.foil THEN p.foil ELSE p.normal END`;
    }

    /**
     * Returns the column name for set price based on options.
     * Business rule: baseOnly + includeFoil determines which pre-calculated price to use.
     */
    static setPriceColumn(includeFoil: boolean, baseOnly: boolean): string {
        if (!includeFoil && baseOnly) return 'base_price';
        if (includeFoil && baseOnly) return 'total_price';
        if (!includeFoil && !baseOnly) return 'base_price_all';
        return 'total_price_all';
    }

    /**
     * Returns SQL for effective set price with fallbacks.
     * Business rule: Try base normal → base all → total normal → total all
     */
    static effectiveSetPriceExpression(alias: string): string {
        return `COALESCE(
            NULLIF("${alias}"."base_price", 0), 
            NULLIF("${alias}"."base_price_all", 0), 
            NULLIF("${alias}"."total_price", 0), 
            "${alias}"."total_price_all"
        )`;
    }

    /**
     * Calculate value from price objects (for service layer use)
     */
    static calculateCardValue(
        normal: number | null,
        foil: number | null,
        includeFoil: boolean
    ): number {
        if (includeFoil) {
            return (normal ?? 0) + (foil ?? 0);
        }
        return normal ?? foil ?? 0;
    }
}
