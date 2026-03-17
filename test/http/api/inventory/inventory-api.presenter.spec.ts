import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Price } from 'src/core/card/price.entity';
import { Set } from 'src/core/set/set.entity';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryApiPresenter } from 'src/http/api/inventory/inventory-api.presenter';

function createSet(overrides: Partial<Set> = {}): Set {
    return new Set({
        code: 'lea',
        name: 'Limited Edition Alpha',
        keyruneCode: 'lea',
        type: 'core',
        block: 'core',
        releaseDate: '1993-08-05',
        baseSize: 295,
        totalSize: 295,
        isMain: true,
        ...overrides,
    });
}

function createPrice(overrides: Partial<Price> = {}): Price {
    return new Price({
        cardId: 'card-1',
        normal: 1.5,
        foil: 3.0,
        date: new Date(),
        ...overrides,
    });
}

function createCard(overrides: Partial<Card> = {}): Card {
    return new Card({
        id: 'card-1',
        name: 'Lightning Bolt',
        setCode: 'lea',
        number: '161',
        type: 'Instant',
        rarity: CardRarity.Common,
        imgSrc: 'a/b/abc123.jpg',
        hasFoil: false,
        hasNonFoil: true,
        sortNumber: '161',
        legalities: [],
        ...overrides,
    });
}

function createInventory(overrides: Partial<Inventory> = {}): Inventory {
    return new Inventory({
        cardId: 'card-1',
        userId: 1,
        isFoil: false,
        quantity: 3,
        ...overrides,
    });
}

describe('InventoryApiPresenter', () => {
    describe('toInventoryItem', () => {
        it('should map full inventory item with card, prices, and set', () => {
            const set = createSet();
            const price = createPrice();
            const card = createCard({ prices: [price], set });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.cardId).toBe('card-1');
            expect(result.quantity).toBe(3);
            expect(result.isFoil).toBe(false);
            expect(result.cardName).toBe('Lightning Bolt');
            expect(result.setCode).toBe('lea');
            expect(result.cardNumber).toBe('161');
            expect(result.imgSrc).toBe('https://cards.scryfall.io/normal/front/a/b/abc123.jpg');
            expect(result.rarity).toBe('common');
            expect(result.keyruneCode).toBe('lea');
            expect(result.priceNormal).toBe(1.5);
            expect(result.priceFoil).toBe(3.0);
            expect(result.url).toBe('/card/lea/161');
            expect(result.hasNonFoil).toBe(true);
            expect(result.hasFoil).toBe(false);
        });

        it('should include tags from card', () => {
            const card = createCard({ isReserved: true, inMain: false });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.tags).toEqual(['Reserved', 'Bonus']);
        });

        it('should return empty tags for normal card', () => {
            const card = createCard({ isReserved: false, inMain: true });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.tags).toEqual([]);
        });

        it('should fall back to setCode for keyruneCode when set is absent', () => {
            const card = createCard({ set: undefined });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.keyruneCode).toBe('lea');
        });

        it('should handle card with empty prices array', () => {
            const card = createCard({ prices: [] });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.priceNormal).toBeNull();
            expect(result.priceFoil).toBeNull();
        });

        it('should handle card with no prices', () => {
            const card = createCard({ prices: undefined });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.priceNormal).toBeNull();
            expect(result.priceFoil).toBeNull();
        });

        it('should return minimal DTO when card is undefined', () => {
            const item = createInventory({ card: undefined });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.cardId).toBe('card-1');
            expect(result.quantity).toBe(3);
            expect(result.isFoil).toBe(false);
            expect(result.cardName).toBeUndefined();
            expect(result.imgSrc).toBeUndefined();
            expect(result.rarity).toBeUndefined();
            expect(result.keyruneCode).toBeUndefined();
            expect(result.priceNormal).toBeUndefined();
            expect(result.priceFoil).toBeUndefined();
            expect(result.tags).toBeUndefined();
            expect(result.url).toBeUndefined();
        });

        it('should handle null price values', () => {
            const price = createPrice({ normal: null, foil: null });
            const card = createCard({ prices: [price] });
            const item = createInventory({ card });

            const result = InventoryApiPresenter.toInventoryItem(item);

            expect(result.priceNormal).toBeNull();
            expect(result.priceFoil).toBeNull();
        });
    });

    describe('toQuantityResponse', () => {
        it('should aggregate foil and normal quantities per card ID', () => {
            const items = [
                createInventory({ cardId: 'card-1', isFoil: false, quantity: 2 }),
                createInventory({ cardId: 'card-1', isFoil: true, quantity: 1 }),
                createInventory({ cardId: 'card-2', isFoil: false, quantity: 5 }),
            ];

            const result = InventoryApiPresenter.toQuantityResponse(items);

            expect(result).toHaveLength(2);

            const card1 = result.find((r) => r.cardId === 'card-1');
            expect(card1).toBeDefined();
            expect(card1.normalQuantity).toBe(2);
            expect(card1.foilQuantity).toBe(1);

            const card2 = result.find((r) => r.cardId === 'card-2');
            expect(card2).toBeDefined();
            expect(card2.normalQuantity).toBe(5);
            expect(card2.foilQuantity).toBe(0);
        });

        it('should return empty array for empty input', () => {
            const result = InventoryApiPresenter.toQuantityResponse([]);
            expect(result).toEqual([]);
        });

        it('should handle multiple foil entries for same card', () => {
            const items = [
                createInventory({ cardId: 'card-1', isFoil: true, quantity: 2 }),
                createInventory({ cardId: 'card-1', isFoil: true, quantity: 3 }),
            ];

            const result = InventoryApiPresenter.toQuantityResponse(items);

            expect(result).toHaveLength(1);
            expect(result[0].foilQuantity).toBe(5);
            expect(result[0].normalQuantity).toBe(0);
        });
    });
});
