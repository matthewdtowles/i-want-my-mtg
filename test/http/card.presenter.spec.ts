import { Price } from 'src/core/card/price.entity';
import { CardPresenter } from 'src/http/card/card.presenter';

describe('CardPresenter', () => {
    describe('formatPriceChange', () => {
        it('returns empty strings when price is undefined', () => {
            const result = CardPresenter.formatPriceChange(undefined);

            expect(result.priceChange7d).toBe('');
            expect(result.priceChange7dSign).toBe('');
        });

        it('returns empty strings when both change values are null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: null,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('');
            expect(result.priceChange7dSign).toBe('');
        });

        it('formats positive change with + prefix and positive sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: 2.5,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('+$2.50');
            expect(result.priceChange7dSign).toBe('positive');
        });

        it('formats negative change with - prefix and negative sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: -1.25,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('-$1.25');
            expect(result.priceChange7dSign).toBe('negative');
        });

        it('formats zero change as neutral', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: 0,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('$0.00');
            expect(result.priceChange7dSign).toBe('neutral');
        });

        it('falls back to foilChange7d when normalChange7d is null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: null,
                foilChange7d: 3.75,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('+$3.75');
            expect(result.priceChange7dSign).toBe('positive');
        });

        it('prefers normalChange7d over foilChange7d when both present', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: -0.5,
                foilChange7d: 10.0,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('-$0.50');
            expect(result.priceChange7dSign).toBe('negative');
        });

        it('formats large values with comma separators', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: 1234.56,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('+$1,234.56');
            expect(result.priceChange7dSign).toBe('positive');
        });

        it('handles string values from database', () => {
            const price = new Price({
                cardId: 'c1',
                normalChange7d: '5.99' as any,
                foilChange7d: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChange7d).toBe('+$5.99');
            expect(result.priceChange7dSign).toBe('positive');
        });
    });
});
