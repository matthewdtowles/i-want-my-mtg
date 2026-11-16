import { CardRarity } from 'src/core/card/card.rarity.enum';
import {
    DEFAULT_MOVER_MIN_PRICE,
    PriceMoverQueryOptions,
} from 'src/core/query/price-mover-query-options.dto';

describe('PriceMoverQueryOptions', () => {
    it('defaults to the biggest percent increases above the default floor', () => {
        const opts = new PriceMoverQueryOptions({});
        expect(opts.direction).toBe('up');
        expect(opts.by).toBe('percent');
        expect(opts.minPrice).toBe(DEFAULT_MOVER_MIN_PRICE);
        expect(opts.finish).toBeUndefined();
        expect(opts.limit).toBe(25);
        expect(opts.page).toBe(1);
    });

    it('reads direction, by, minPrice and the catalog filters', () => {
        const opts = new PriceMoverQueryOptions({
            direction: 'DOWN',
            by: 'amount',
            minPrice: '0',
            finish: 'foil',
            rarity: 'mythic',
            setCode: 'ROE',
            limit: '10',
        });
        expect(opts.direction).toBe('down');
        expect(opts.by).toBe('amount');
        expect(opts.minPrice).toBe(0);
        expect(opts.finish).toBe('foil');
        expect(opts.rarity).toBe(CardRarity.Mythic);
        expect(opts.setCode).toBe('roe');
        expect(opts.limit).toBe(10);
    });

    it('falls back to the defaults for invalid values', () => {
        const opts = new PriceMoverQueryOptions({
            direction: 'sideways',
            by: 'volume',
            minPrice: '-3',
        });
        expect(opts.direction).toBe('up');
        expect(opts.by).toBe('percent');
        expect(opts.minPrice).toBe(DEFAULT_MOVER_MIN_PRICE);
    });

    it('treats repeated (array) params as not provided', () => {
        const opts = new PriceMoverQueryOptions({
            direction: ['down'],
            minPrice: ['1'],
        } as never);
        expect(opts.direction).toBe('up');
        expect(opts.minPrice).toBe(DEFAULT_MOVER_MIN_PRICE);
    });
});
