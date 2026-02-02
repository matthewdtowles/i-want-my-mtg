import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';

describe('PriceCalculationPolicy', () => {
    describe('cardValueExpression', () => {
        it('should return sum expression when includeFoil is true', () => {
            const result = PriceCalculationPolicy.cardValueExpression(true);
            expect(result).toBe('(COALESCE(p.normal, 0) + COALESCE(p.foil, 0))');
        });

        it('should return fallback expression when includeFoil is false', () => {
            const result = PriceCalculationPolicy.cardValueExpression(false);
            expect(result).toBe('COALESCE(p.normal, p.foil, 0)');
        });
    });

    describe('inventoryItemValueExpression', () => {
        it('should return CASE expression for foil/normal price selection', () => {
            const result = PriceCalculationPolicy.inventoryItemValueExpression();
            expect(result).toBe('CASE WHEN i.foil THEN p.foil ELSE p.normal END');
        });
    });

    describe('setPriceColumn', () => {
        it('should return base_price for non-foil, baseOnly', () => {
            const result = PriceCalculationPolicy.setPriceColumn(false, true);
            expect(result).toBe('base_price');
        });

        it('should return total_price for foil, baseOnly', () => {
            const result = PriceCalculationPolicy.setPriceColumn(true, true);
            expect(result).toBe('total_price');
        });

        it('should return base_price_all for non-foil, not baseOnly', () => {
            const result = PriceCalculationPolicy.setPriceColumn(false, false);
            expect(result).toBe('base_price_all');
        });

        it('should return total_price_all for foil, not baseOnly', () => {
            const result = PriceCalculationPolicy.setPriceColumn(true, false);
            expect(result).toBe('total_price_all');
        });
    });

    describe('effectiveSetPriceExpression', () => {
        it('should return COALESCE expression with default alias', () => {
            const result = PriceCalculationPolicy.effectiveSetPriceExpression();
            expect(result).toContain('setPrice.basePrice');
            expect(result).toContain('setPrice.basePriceAll');
            expect(result).toContain('setPrice.totalPrice');
            expect(result).toContain('setPrice.totalPriceAll');
            expect(result).toContain('COALESCE');
            expect(result).toContain('NULLIF');
        });

        it('should use custom alias when provided', () => {
            const result = PriceCalculationPolicy.effectiveSetPriceExpression('sp');
            expect(result).toContain('sp.basePrice');
            expect(result).toContain('sp.basePriceAll');
            expect(result).toContain('sp.totalPrice');
            expect(result).toContain('sp.totalPriceAll');
        });
    });

    describe('calculateCardValue', () => {
        describe('when includeFoil is true', () => {
            it('should sum normal and foil prices', () => {
                const result = PriceCalculationPolicy.calculateCardValue(10, 20, true);
                expect(result).toBe(30);
            });

            it('should treat null normal as 0', () => {
                const result = PriceCalculationPolicy.calculateCardValue(null, 20, true);
                expect(result).toBe(20);
            });

            it('should treat null foil as 0', () => {
                const result = PriceCalculationPolicy.calculateCardValue(10, null, true);
                expect(result).toBe(10);
            });

            it('should return 0 when both are null', () => {
                const result = PriceCalculationPolicy.calculateCardValue(null, null, true);
                expect(result).toBe(0);
            });
        });

        describe('when includeFoil is false', () => {
            it('should return normal price when available', () => {
                const result = PriceCalculationPolicy.calculateCardValue(10, 20, false);
                expect(result).toBe(10);
            });

            it('should fallback to foil when normal is null', () => {
                const result = PriceCalculationPolicy.calculateCardValue(null, 20, false);
                expect(result).toBe(20);
            });

            it('should return 0 when both are null', () => {
                const result = PriceCalculationPolicy.calculateCardValue(null, null, false);
                expect(result).toBe(0);
            });

            it('should return 0 when normal is 0 (not null)', () => {
                // This tests the ?? behavior - 0 is not nullish so it returns 0
                const result = PriceCalculationPolicy.calculateCardValue(0, 20, false);
                expect(result).toBe(0);
            });
        });
    });
});