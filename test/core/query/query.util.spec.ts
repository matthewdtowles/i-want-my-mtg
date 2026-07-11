import { resolveSort, sanitizeInt } from 'src/core/query/query.util';
import { SortOptions, TRANSACTION_SORTS } from 'src/core/query/sort-options.enum';

describe('sanitizeInt', () => {
    it('parses a valid positive integer string', () => {
        expect(sanitizeInt('42', 25)).toBe(42);
    });

    it('falls back to the default for non-numeric, zero, or negative input', () => {
        expect(sanitizeInt('abc', 25)).toBe(25);
        expect(sanitizeInt('0', 25)).toBe(25);
        expect(sanitizeInt('-5', 25)).toBe(25);
        expect(sanitizeInt(undefined, 25)).toBe(25);
        expect(sanitizeInt(['a', 'b'] as never, 25)).toBe(25);
    });

    it('clamps to max when one is given', () => {
        expect(sanitizeInt('1000000', 25, 100)).toBe(100);
        expect(sanitizeInt('50', 25, 100)).toBe(50);
    });

    it('does not clamp when no max is given', () => {
        expect(sanitizeInt('1000000', 25)).toBe(1000000);
    });

    it('coerces a numeric input to an integer and rejects non-finite numbers', () => {
        expect(sanitizeInt(2.7, 25)).toBe(2);
        expect(sanitizeInt(NaN, 25)).toBe(25);
        expect(sanitizeInt(NaN, 25, 100)).toBe(25);
        expect(sanitizeInt(Infinity, 25)).toBe(25);
        expect(sanitizeInt(0.5, 25)).toBe(25);
        expect(sanitizeInt(50, 25)).toBe(50);
    });
});

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
