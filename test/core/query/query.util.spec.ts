import { resolveSort, safeBoolean, sanitizeInt } from 'src/core/query/query.util';
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

describe('safeBoolean', () => {
    it('parses the string and boolean forms of true and false', () => {
        expect(safeBoolean('true')).toBe(true);
        expect(safeBoolean('TRUE')).toBe(true);
        expect(safeBoolean('1')).toBe(true);
        expect(safeBoolean(true)).toBe(true);
        expect(safeBoolean('false')).toBe(false);
        expect(safeBoolean('False')).toBe(false);
        expect(safeBoolean('0')).toBe(false);
        expect(safeBoolean(false)).toBe(false);
    });

    it('defaults to false when the value is missing or unparseable', () => {
        expect(safeBoolean(undefined)).toBe(false);
        expect(safeBoolean(null)).toBe(false);
        expect(safeBoolean('yes')).toBe(false);
        expect(safeBoolean(['true'] as never)).toBe(false);
    });

    it('uses an explicit default when one is given', () => {
        expect(safeBoolean(undefined, true)).toBe(true);
        expect(safeBoolean('nonsense', true)).toBe(true);
        // an explicit default never overrides a parseable value
        expect(safeBoolean('false', true)).toBe(false);
    });
});
