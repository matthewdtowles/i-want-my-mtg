import { GranularPrice } from 'src/core/card/granular-price.entity';
import { bestBuylistOffer } from 'src/core/pricing/buylist.policy';

function offer(overrides: Partial<GranularPrice> = {}): GranularPrice {
    return new GranularPrice({
        cardId: 'card-1',
        provider: 'cardkingdom',
        priceType: 'buylist',
        finish: 'normal',
        condition: 'NM',
        price: 1,
        ...overrides,
    });
}

describe('bestBuylistOffer', () => {
    it('returns null when there are no usable offers', () => {
        expect(bestBuylistOffer([])).toBeNull();
        expect(bestBuylistOffer([offer({ condition: 'LP', price: 9 })])).toBeNull();
        expect(bestBuylistOffer([offer({ price: 0 })])).toBeNull();
        expect(bestBuylistOffer([offer({ price: null })])).toBeNull();
    });

    it('returns the highest NM offer across finishes and vendors', () => {
        const result = bestBuylistOffer([
            offer({ provider: 'cardkingdom', finish: 'normal', price: 3.5 }),
            offer({ provider: 'cardsphere', finish: 'normal', price: 3.25 }),
            offer({ provider: 'cardkingdom', finish: 'foil', price: 7 }),
        ]);
        expect(result).toBe(7);
    });
});
