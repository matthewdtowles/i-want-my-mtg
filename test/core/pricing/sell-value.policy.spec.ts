import { GranularPrice } from 'src/core/card/granular-price.entity';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { buildSellPlan } from 'src/core/pricing/sell-value.policy';

function makeItem(overrides: Partial<Inventory> = {}): Inventory {
    return new Inventory({
        cardId: 'card-1',
        userId: 1,
        isFoil: false,
        quantity: 4,
        ...overrides,
    });
}

function makeOffer(overrides: Partial<GranularPrice> = {}): GranularPrice {
    return new GranularPrice({
        cardId: 'card-1',
        provider: 'cardkingdom',
        priceType: 'buylist',
        finish: 'normal',
        condition: 'NM',
        date: new Date('2026-06-01'),
        price: 2.5,
        qty: null,
        ...overrides,
    });
}

describe('buildSellPlan', () => {
    it('returns an empty plan for empty inputs', () => {
        const plan = buildSellPlan([], []);
        expect(plan.groups).toEqual([]);
        expect(plan.totalPayout).toBe(0);
        expect(plan.itemsWithOffers).toBe(0);
        expect(plan.itemsWithoutOffers).toBe(0);
    });

    it('pays offer price times owned quantity when buy qty is unknown', () => {
        const plan = buildSellPlan([makeItem({ quantity: 4 })], [makeOffer({ price: 2.5 })]);

        expect(plan.itemsWithOffers).toBe(1);
        const item = plan.groups[0].items[0];
        expect(item.sellableQuantity).toBe(4);
        expect(item.quantityCapped).toBe(false);
        expect(item.payout).toBeCloseTo(10);
        expect(plan.totalPayout).toBeCloseTo(10);
    });

    it('caps the payout at the vendor buy quantity', () => {
        const plan = buildSellPlan(
            [makeItem({ quantity: 4 })],
            [makeOffer({ price: 2.5, qty: 3 })]
        );

        const item = plan.groups[0].items[0];
        expect(item.sellableQuantity).toBe(3);
        expect(item.quantityCapped).toBe(true);
        expect(item.payout).toBeCloseTo(7.5);
    });

    it('does not cap when the vendor buys more than owned', () => {
        const plan = buildSellPlan(
            [makeItem({ quantity: 2 })],
            [makeOffer({ price: 2.5, qty: 16 })]
        );

        const item = plan.groups[0].items[0];
        expect(item.sellableQuantity).toBe(2);
        expect(item.quantityCapped).toBe(false);
    });

    it('matches inventory finish: foil items only match foil offers', () => {
        const normalOffer = makeOffer({ finish: 'normal', price: 1 });
        const foilOffer = makeOffer({ finish: 'foil', price: 5 });
        const plan = buildSellPlan(
            [makeItem({ isFoil: true, quantity: 1 })],
            [normalOffer, foilOffer]
        );

        expect(plan.itemsWithOffers).toBe(1);
        expect(plan.groups[0].items[0].offer).toBe(foilOffer);
    });

    it('does not match etched offers to foil inventory', () => {
        const plan = buildSellPlan(
            [makeItem({ isFoil: true })],
            [makeOffer({ finish: 'etched', price: 9 })]
        );

        expect(plan.itemsWithOffers).toBe(0);
        expect(plan.itemsWithoutOffers).toBe(1);
    });

    it('picks the highest offer across providers for an item', () => {
        const low = makeOffer({ provider: 'cardsphere', price: 1.5 });
        const high = makeOffer({ provider: 'cardkingdom', price: 2.0 });
        const plan = buildSellPlan([makeItem({ quantity: 1 })], [low, high]);

        expect(plan.groups).toHaveLength(1);
        expect(plan.groups[0].provider).toBe('cardkingdom');
        expect(plan.groups[0].items[0].offer).toBe(high);
    });

    it('ignores non-NM and non-positive offers', () => {
        const plan = buildSellPlan(
            [makeItem()],
            [makeOffer({ condition: 'EX', price: 9 }), makeOffer({ price: 0 })]
        );

        expect(plan.itemsWithOffers).toBe(0);
        expect(plan.itemsWithoutOffers).toBe(1);
    });

    it('counts items with no offer at all', () => {
        const plan = buildSellPlan(
            [makeItem(), makeItem({ cardId: 'card-2', quantity: 1 })],
            [makeOffer({ cardId: 'card-2', price: 3 })]
        );

        expect(plan.itemsWithOffers).toBe(1);
        expect(plan.itemsWithoutOffers).toBe(1);
        expect(plan.totalPayout).toBeCloseTo(3);
    });

    it('skips zero-quantity inventory rows entirely', () => {
        const plan = buildSellPlan([makeItem({ quantity: 0 })], [makeOffer()]);

        expect(plan.itemsWithOffers).toBe(0);
        expect(plan.itemsWithoutOffers).toBe(0);
    });

    it('groups items by best-offer vendor and sorts groups and items by payout', () => {
        const items = [
            makeItem({ cardId: 'card-1', quantity: 1 }), // CK $2
            makeItem({ cardId: 'card-2', quantity: 1 }), // CK $10
            makeItem({ cardId: 'card-3', quantity: 1 }), // cardsphere $5
        ];
        const offers = [
            makeOffer({ cardId: 'card-1', provider: 'cardkingdom', price: 2 }),
            makeOffer({ cardId: 'card-2', provider: 'cardkingdom', price: 10 }),
            makeOffer({ cardId: 'card-3', provider: 'cardsphere', price: 5 }),
        ];
        const plan = buildSellPlan(items, offers);

        expect(plan.groups.map((g) => g.provider)).toEqual(['cardkingdom', 'cardsphere']);
        expect(plan.groups[0].payout).toBeCloseTo(12);
        expect(plan.groups[0].items.map((i) => i.payout)).toEqual([10, 2]);
        expect(plan.groups[1].payout).toBeCloseTo(5);
        expect(plan.totalPayout).toBeCloseTo(17);
    });

    it('treats normal and foil of the same card as separate items', () => {
        const items = [
            makeItem({ isFoil: false, quantity: 1 }),
            makeItem({ isFoil: true, quantity: 1 }),
        ];
        const offers = [
            makeOffer({ finish: 'normal', price: 1 }),
            makeOffer({ finish: 'foil', price: 4 }),
        ];
        const plan = buildSellPlan(items, offers);

        expect(plan.itemsWithOffers).toBe(2);
        expect(plan.totalPayout).toBeCloseTo(5);
    });

    it('drops an item whose vendor buy quantity is zero', () => {
        const plan = buildSellPlan([makeItem({ quantity: 4 })], [makeOffer({ qty: 0 })]);

        expect(plan.itemsWithOffers).toBe(0);
        expect(plan.itemsWithoutOffers).toBe(1);
        expect(plan.totalPayout).toBe(0);
    });
});
