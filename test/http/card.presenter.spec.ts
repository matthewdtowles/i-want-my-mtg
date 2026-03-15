import { Price } from 'src/core/card/price.entity';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';

describe('CardPresenter', () => {
    describe('formatPriceChange', () => {
        it('returns empty strings when price is undefined', () => {
            const result = CardPresenter.formatPriceChange(undefined);

            expect(result.priceChangeWeekly).toBe('');
            expect(result.priceChangeWeeklySign).toBe('');
            expect(result.foilPriceChangeWeekly).toBe('');
            expect(result.foilPriceChangeWeeklySign).toBe('');
        });

        it('returns empty strings when both change values are null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: null,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('');
            expect(result.priceChangeWeeklySign).toBe('');
            expect(result.foilPriceChangeWeekly).toBe('');
            expect(result.foilPriceChangeWeeklySign).toBe('');
        });

        it('formats positive change with + prefix and positive sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 2.5,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$2.50');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });

        it('formats negative change with - prefix and negative sign', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: -1.25,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('-$1.25');
            expect(result.priceChangeWeeklySign).toBe('negative');
        });

        it('formats zero change as neutral', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 0,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('$0.00');
            expect(result.priceChangeWeeklySign).toBe('neutral');
        });

        it('falls back to foilChangeWeekly when normalChangeWeekly is null', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: null,
                foilChangeWeekly: 3.75,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$3.75');
            expect(result.priceChangeWeeklySign).toBe('positive');
            expect(result.foilPriceChangeWeekly).toBe('+$3.75');
            expect(result.foilPriceChangeWeeklySign).toBe('positive');
        });

        it('prefers normalChangeWeekly over foilChangeWeekly when both present', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: -0.5,
                foilChangeWeekly: 10.0,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('-$0.50');
            expect(result.priceChangeWeeklySign).toBe('negative');
            expect(result.foilPriceChangeWeekly).toBe('+$10.00');
            expect(result.foilPriceChangeWeeklySign).toBe('positive');
        });

        it('formats large values with comma separators', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: 1234.56,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$1,234.56');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });

        it('handles string values from database', () => {
            const price = new Price({
                cardId: 'c1',
                normalChangeWeekly: '5.99' as any,
                foilChangeWeekly: null,
            });

            const result = CardPresenter.formatPriceChange(price);

            expect(result.priceChangeWeekly).toBe('+$5.99');
            expect(result.priceChangeWeeklySign).toBe('positive');
        });
    });
});
