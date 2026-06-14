import { GranularPrice } from 'src/core/card/granular-price.entity';
import { bestBuylistOffer, groupBuylistByFinish } from 'src/core/pricing/buylist.policy';

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

    it('returns the highest NM offer across finishes and vendors, with its finish', () => {
        const result = bestBuylistOffer([
            offer({ provider: 'cardkingdom', finish: 'normal', price: 3.5 }),
            offer({ provider: 'cardsphere', finish: 'normal', price: 3.25 }),
            offer({ provider: 'cardkingdom', finish: 'foil', price: 7 }),
        ]);
        expect(result?.price).toBe(7);
        expect(result?.finish).toBe('foil');
    });
});

describe('groupBuylistByFinish', () => {
    it('drops non-NM, zero, and null-priced offers', () => {
        expect(
            groupBuylistByFinish([
                offer({ condition: 'LP', price: 9 }),
                offer({ price: 0 }),
                offer({ price: null }),
            ])
        ).toEqual([]);
    });

    it('orders finishes normal, foil, etched and offers highest-first with isBest marked', () => {
        const groups = groupBuylistByFinish([
            offer({ finish: 'foil', provider: 'cardkingdom', price: 7 }),
            offer({ finish: 'normal', provider: 'cardsphere', price: 3.25 }),
            offer({ finish: 'normal', provider: 'cardkingdom', price: 3.5 }),
        ]);

        expect(groups.map((g) => g.finish)).toEqual(['normal', 'foil']);
        const normal = groups[0];
        expect(normal.offers).toEqual([
            { provider: 'cardkingdom', price: 3.5, isBest: true },
            { provider: 'cardsphere', price: 3.25, isBest: false },
        ]);
        expect(groups[1].offers).toEqual([{ provider: 'cardkingdom', price: 7, isBest: true }]);
    });
});
