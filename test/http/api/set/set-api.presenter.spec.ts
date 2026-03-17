import { Set } from 'src/core/set/set.entity';
import { SetPrice } from 'src/core/set/set-price.entity';
import { SetApiPresenter } from 'src/http/api/set/set-api.presenter';

function createSet(overrides: Partial<Set> = {}): Set {
    return new Set({
        code: 'mkm',
        name: 'Murders at Karlov Manor',
        type: 'expansion',
        releaseDate: '2024-02-09',
        baseSize: 286,
        totalSize: 421,
        keyruneCode: 'mkm',
        isMain: true,
        ...overrides,
    });
}

function createSetPrice(overrides: Partial<SetPrice> = {}): SetPrice {
    return new SetPrice({
        setCode: 'mkm',
        basePrice: 120.5,
        totalPrice: 250.75,
        basePriceAll: 180.25,
        totalPriceAll: 400.0,
        basePriceChangeWeekly: 2.5,
        totalPriceChangeWeekly: -1.75,
        ...overrides,
    });
}

describe('SetApiPresenter', () => {
    describe('toSetApiResponse', () => {
        it('should map all set fields correctly', () => {
            const set = createSet({
                block: 'Ravnica',
                parentCode: 'rav',
                prices: createSetPrice(),
            });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.code).toBe('mkm');
            expect(result.name).toBe('Murders at Karlov Manor');
            expect(result.type).toBe('expansion');
            expect(result.releaseDate).toBe('2024-02-09');
            expect(result.baseSize).toBe(286);
            expect(result.totalSize).toBe(421);
            expect(result.keyruneCode).toBe('mkm');
            expect(result.block).toBe('Ravnica');
            expect(result.parentCode).toBe('rav');
            expect(result.isMain).toBe(true);
        });

        it('should map prices as raw numbers', () => {
            const set = createSet({ prices: createSetPrice() });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.prices).toEqual({
                basePrice: 120.5,
                totalPrice: 250.75,
                basePriceAll: 180.25,
                totalPriceAll: 400.0,
                basePriceChangeWeekly: 2.5,
                totalPriceChangeWeekly: -1.75,
            });
        });

        it('should return undefined prices when set has no prices', () => {
            const set = createSet({ prices: undefined });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.prices).toBeUndefined();
        });

        it('should derive tags for bonus set types', () => {
            const set = createSet({ type: 'commander', isMain: false });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.tags).toEqual(['Commander']);
        });

        it('should derive "Bonus" tag for non-main sets with non-bonus type', () => {
            const set = createSet({ type: 'expansion', isMain: false });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.tags).toEqual(['Bonus']);
        });

        it('should derive empty tags for main expansion sets', () => {
            const set = createSet({ type: 'expansion', isMain: true });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.tags).toEqual([]);
        });

        it('should handle multi-word bonus types', () => {
            const set = createSet({ type: 'duel_deck', isMain: false });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.tags).toEqual(['Duel Deck']);
        });

        it('should handle parentCode being undefined', () => {
            const set = createSet({ parentCode: undefined });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.parentCode).toBeUndefined();
        });

        it('should handle block being undefined', () => {
            const set = createSet({ block: undefined });
            const result = SetApiPresenter.toSetApiResponse(set);

            expect(result.block).toBeUndefined();
        });
    });
});
