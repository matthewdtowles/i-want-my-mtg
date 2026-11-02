import {
    latestPriceCondition,
    latestPriceConditionForManySets,
} from 'src/database/query/latest-price.sql';

describe('latestPriceCondition', () => {
    it('builds the correlated latest-price predicate for query-builder aliases', () => {
        expect(latestPriceCondition('prices', 'card')).toBe(
            'prices.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = card.id)'
        );
    });

    it('supports the raw-SQL aliases used in the inventory aggregate queries', () => {
        expect(latestPriceCondition('p', 'c')).toBe(
            'p.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = c.id)'
        );
    });
});

describe('latestPriceConditionForManySets', () => {
    it('builds the no-newer-price predicate', () => {
        expect(latestPriceConditionForManySets('p', 'c')).toBe(
            'NOT EXISTS (SELECT 1 FROM price p2 WHERE p2.card_id = c.id AND p2.date > p.date)'
        );
    });
});
