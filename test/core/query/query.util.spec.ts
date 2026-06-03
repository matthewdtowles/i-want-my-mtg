import { resolveSort } from 'src/core/query/query.util';
import { SortOptions, TRANSACTION_SORTS } from 'src/core/query/sort-options.enum';

describe('resolveSort', () => {
    it('returns the sort when it is in the allowed set', () => {
        expect(resolveSort(SortOptions.TX_DATE, TRANSACTION_SORTS)).toBe(SortOptions.TX_DATE);
    });

    it('returns undefined for a sort outside the allowed set', () => {
        // a real SortOptions value, just not honorable by this context
        expect(resolveSort(SortOptions.CARD, TRANSACTION_SORTS)).toBeUndefined();
    });

    it('returns undefined when no sort is requested', () => {
        expect(resolveSort(undefined, TRANSACTION_SORTS)).toBeUndefined();
    });
});
