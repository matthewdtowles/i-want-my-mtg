import { SetPrice } from 'src/core/set/set-price.entity';
import { SetPresenter } from 'src/http/hbs/set/set.presenter';

describe('SetPresenter.toSetPriceDto', () => {
    it('returns an empty tier layout when every price is zero', () => {
        const result = SetPresenter.toSetPriceDto(
            new SetPrice({ basePrice: 0, basePriceAll: 0, totalPrice: 0, totalPriceAll: 0 })
        );

        expect(result.gridCols).toBe(0);
        expect(result.defaultPrice).toBe('-');
        expect(result.basePriceNormal).toBeNull();
        expect(result.totalPriceAll).toBeNull();
    });

    it('tolerates a null SetPrice', () => {
        const result = SetPresenter.toSetPriceDto(null);

        expect(result.gridCols).toBe(0);
        expect(result.defaultPrice).toBe('-');
    });

    it('uses base price as the default when it is the only tier', () => {
        const result = SetPresenter.toSetPriceDto(new SetPrice({ basePrice: 100.5 }));

        expect(result.gridCols).toBe(1);
        expect(result.defaultPrice).toBe('$100.50');
        expect(result.basePriceNormal).toBe('$100.50');
    });

    it('deduplicates tiers that share the same value', () => {
        // totalPrice === basePrice and totalPriceAll === basePriceAll, so only the
        // two distinct base tiers survive.
        const result = SetPresenter.toSetPriceDto(
            new SetPrice({
                basePrice: 10,
                totalPrice: 10,
                basePriceAll: 25,
                totalPriceAll: 25,
            })
        );

        expect(result.gridCols).toBe(2);
        expect(result.basePriceNormal).toBe('$10.00');
        expect(result.basePriceAll).toBe('$25.00');
        expect(result.totalPriceNormal).toBeNull();
        expect(result.totalPriceAll).toBeNull();
    });

    it('formats the weekly change on the default tier with a sign', () => {
        const result = SetPresenter.toSetPriceDto(
            new SetPrice({ basePrice: 100, basePriceChangeWeekly: 5 })
        );

        expect(result.defaultPriceChangeWeekly).toBe('+$5.00');
        expect(result.defaultPriceChangeWeeklySign).toBe('positive');
    });
});
