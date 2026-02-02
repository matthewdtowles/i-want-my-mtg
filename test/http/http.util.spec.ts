import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SortOptions } from 'src/core/query/sort-options.enum';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import {
    completionRate,
    toDollar,
    isAuthenticated,
    buildQueryString,
    toStringRecord,
} from 'src/http/base/http.util';

describe('toDollar', () => {
    it('should handle numbers less than 1 correctly', () => {
        expect(toDollar(0.5)).toBe('$0.50');
    });

    it('should handle whole numbers correctly', () => {
        expect(toDollar(1000)).toBe('$1,000.00');
    });

    it('should handle negative numbers correctly', () => {
        expect(toDollar(-1234.56)).toBe('$-1,234.56');
    });

    it('should handle zero correctly', () => {
        expect(toDollar(0)).toBe('-');
    });

    it('should handle null and undefined values correctly', () => {
        expect(toDollar(null)).toBe('-');
        expect(toDollar(undefined)).toBe('-');
    });

    it('should handle more than 2 decimals correctly', () => {
        expect(toDollar(90.12345)).toBe('$90.12');
    });

    it('should handle multi-comma large numbers correctly', () => {
        expect(toDollar(1234567890)).toBe('$1,234,567,890.00');
    });

    it('should handle small numbers correctly', () => {
        expect(toDollar(0.0001)).toBe('$0.00');
    });
});

describe('completionRate', () => {
    it('should return 0 if total owned is 0', () => {
        expect(completionRate(0, 100)).toBe(0);
    });

    it('should return 0 if total owned is less than 0', () => {
        expect(completionRate(-1, 100)).toBe(0);
    });

    it('should return 0 if total cards in set is 0', () => {
        expect(completionRate(1, 0)).toBe(0);
    });

    it('should return 0 if total cards in set is less than 0', () => {
        expect(completionRate(1, -1)).toBe(0);
    });

    it('should return 100 if total owned is equal to total in set', () => {
        expect(completionRate(350, 350)).toBe(100);
    });

    it('should return 100 if total owned is greater than total in set', () => {
        expect(completionRate(500, 350)).toBe(100);
    });

    it('should return completion rate to nearest two decimals', () => {
        expect(completionRate(349, 350)).toBe(99.71);
    });
});

describe('isAuthenticated', () => {
    it('should return true if user exists and isAuthenticated returns true', () => {
        const req = { user: {}, isAuthenticated: () => true } as AuthenticatedRequest;
        expect(isAuthenticated(req)).toBe(true);
    });

    it('should return false if user exists and isAuthenticated returns false', () => {
        const req = { user: {}, isAuthenticated: () => false } as AuthenticatedRequest;
        expect(isAuthenticated(req)).toBe(false);
    });

    it('should return false if user is null', () => {
        const req = { user: null, isAuthenticated: () => true } as AuthenticatedRequest;
        expect(isAuthenticated(req)).toBe(false);
    });

    it('should return false if isAuthenticated is not a function', () => {
        const req = { user: {} } as AuthenticatedRequest;
        expect(isAuthenticated(req)).toBe(false);
    });

    it('should return false if user is undefined', () => {
        const req = { isAuthenticated: () => true } as AuthenticatedRequest;
        expect(isAuthenticated(req)).toBe(false);
    });
});

describe('buildQueryString', () => {
    it('should return empty string if no options are provided', () => {
        expect(buildQueryString({} as SafeQueryOptions)).toBe('');
    });

    it('should build query string with page and limit', () => {
        expect(buildQueryString({ page: 2, limit: 50 } as SafeQueryOptions)).toBe(
            '?page=2&limit=50'
        );
    });

    it('should build query string with page, limit, and baseOnly true (baseOnly omitted)', () => {
        expect(buildQueryString({ page: 2, limit: 50, baseOnly: true } as SafeQueryOptions)).toBe(
            '?page=2&limit=50'
        );
    });

    it('should build query string with filter and sort', () => {
        const options = {
            page: 1,
            limit: 25,
            filter: 'foo',
            sort: SortOptions.CARD,
        } as SafeQueryOptions;
        expect(buildQueryString(options)).toBe('?page=1&limit=25&filter=foo&sort=card.name');
    });

    it('should build query string with ascend true', () => {
        const options = { page: 1, limit: 25, ascend: true } as SafeQueryOptions;
        expect(buildQueryString(options)).toBe('?page=1&limit=25&ascend=true');
    });

    it('should build query string with ascend false', () => {
        const options = { page: 1, limit: 25, ascend: false } as SafeQueryOptions;
        expect(buildQueryString(options)).toBe('?page=1&limit=25&ascend=false');
    });

    it('should build query string with filter, ascend, sort, and limit', () => {
        const options = {
            page: 1,
            limit: 100,
            filter: 'baz',
            ascend: false,
            sort: SortOptions.CARD,
        } as SafeQueryOptions;
        expect(buildQueryString(options)).toBe(
            '?page=1&limit=100&filter=baz&ascend=false&sort=card.name'
        );
    });

    it('should build query string with baseOnly false', () => {
        const options = { page: 1, limit: 25, baseOnly: false } as SafeQueryOptions;
        expect(buildQueryString(options)).toBe('?page=1&limit=25&baseOnly=false');
    });

    it('should use SafeQueryOptions defaults when constructed', () => {
        const options = new SafeQueryOptions({ baseOnly: 'false' });
        expect(buildQueryString(options)).toBe('?page=1&limit=25&ascend=true&baseOnly=false');
    });
});

describe('toStringRecord', () => {
    it('should return empty object for empty input', () => {
        expect(toStringRecord({})).toEqual({});
    });

    it('should include string values', () => {
        expect(toStringRecord({ page: '1', limit: '25' })).toEqual({ page: '1', limit: '25' });
    });

    it('should exclude array values', () => {
        expect(toStringRecord({ page: '1', tags: ['a', 'b'] })).toEqual({ page: '1' });
    });

    it('should exclude nested object values', () => {
        expect(toStringRecord({ page: '1', nested: { foo: 'bar' } })).toEqual({ page: '1' });
    });

    it('should exclude number values', () => {
        expect(toStringRecord({ page: '1', count: 42 })).toEqual({ page: '1' });
    });

    it('should exclude boolean values', () => {
        expect(toStringRecord({ page: '1', active: true })).toEqual({ page: '1' });
    });

    it('should exclude null values', () => {
        expect(toStringRecord({ page: '1', empty: null })).toEqual({ page: '1' });
    });

    it('should exclude undefined values', () => {
        expect(toStringRecord({ page: '1', missing: undefined })).toEqual({ page: '1' });
    });

    it('should handle mixed types and only include strings', () => {
        const input = {
            page: '1',
            limit: '25',
            filter: 'test',
            count: 100,
            active: false,
            tags: ['a', 'b'],
            nested: { foo: 'bar' },
            empty: null,
            missing: undefined,
        };
        expect(toStringRecord(input)).toEqual({
            page: '1',
            limit: '25',
            filter: 'test',
        });
    });

    it('should handle empty string values', () => {
        expect(toStringRecord({ page: '', limit: '25' })).toEqual({ page: '', limit: '25' });
    });
});
