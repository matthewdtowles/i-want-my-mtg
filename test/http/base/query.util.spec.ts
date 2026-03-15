import { parseDaysParam } from 'src/http/base/query.util';

describe('parseDaysParam', () => {
    it('should return parsed number for valid positive integer string', () => {
        expect(parseDaysParam('30')).toBe(30);
    });

    it('should return parsed number for "1"', () => {
        expect(parseDaysParam('1')).toBe(1);
    });

    it('should return undefined for undefined input', () => {
        expect(parseDaysParam(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
        expect(parseDaysParam('')).toBeUndefined();
    });

    it('should return undefined for non-numeric string', () => {
        expect(parseDaysParam('abc')).toBeUndefined();
    });

    it('should return undefined for zero', () => {
        expect(parseDaysParam('0')).toBeUndefined();
    });

    it('should return undefined for negative number', () => {
        expect(parseDaysParam('-5')).toBeUndefined();
    });

    it('should return undefined for float string', () => {
        expect(parseDaysParam('3.5')).toBeUndefined();
    });

    it('should return undefined for NaN-producing string', () => {
        expect(parseDaysParam('NaN')).toBeUndefined();
    });

    it('should return undefined for Infinity', () => {
        expect(parseDaysParam('Infinity')).toBeUndefined();
    });

    it('should handle large valid numbers', () => {
        expect(parseDaysParam('365')).toBe(365);
    });
});
