import { formatUtcDate, formatUtcTimestamp } from 'src/http/base/date.util';

describe('formatUtcDate', () => {
    it('should format a Date object as YYYY-MM-DD in UTC', () => {
        const date = new Date(Date.UTC(2024, 0, 15)); // Jan 15, 2024
        expect(formatUtcDate(date)).toBe('2024-01-15');
    });

    it('should pad single-digit month and day', () => {
        const date = new Date(Date.UTC(2024, 2, 5)); // Mar 5, 2024
        expect(formatUtcDate(date)).toBe('2024-03-05');
    });

    it('should handle December 31st', () => {
        const date = new Date(Date.UTC(2024, 11, 31));
        expect(formatUtcDate(date)).toBe('2024-12-31');
    });

    it('should format a string date', () => {
        expect(formatUtcDate('2024-06-15')).toBe('2024-06-15');
    });

    it('should format an ISO string date', () => {
        expect(formatUtcDate('2024-06-15T14:30:00.000Z')).toBe('2024-06-15');
    });

    it('should return empty string for null', () => {
        expect(formatUtcDate(null as unknown as Date)).toBe('');
    });

    it('should return empty string for undefined', () => {
        expect(formatUtcDate(undefined as unknown as Date)).toBe('');
    });

    it('should use UTC to avoid timezone issues', () => {
        // Date at midnight UTC on Jan 1 - local timezone could shift to Dec 31
        const date = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
        expect(formatUtcDate(date)).toBe('2024-01-01');
    });
});

describe('formatUtcTimestamp', () => {
    it('should format a Date object as YYYY-MM-DD HH:MM in UTC', () => {
        const date = new Date(Date.UTC(2024, 0, 15, 14, 30));
        expect(formatUtcTimestamp(date)).toBe('2024-01-15 14:30');
    });

    it('should pad single-digit hours and minutes', () => {
        const date = new Date(Date.UTC(2024, 2, 5, 3, 7));
        expect(formatUtcTimestamp(date)).toBe('2024-03-05 03:07');
    });

    it('should handle midnight', () => {
        const date = new Date(Date.UTC(2024, 5, 1, 0, 0));
        expect(formatUtcTimestamp(date)).toBe('2024-06-01 00:00');
    });

    it('should handle end of day', () => {
        const date = new Date(Date.UTC(2024, 11, 31, 23, 59));
        expect(formatUtcTimestamp(date)).toBe('2024-12-31 23:59');
    });

    it('should return empty string for null', () => {
        expect(formatUtcTimestamp(null as unknown as Date)).toBe('');
    });

    it('should return empty string for undefined', () => {
        expect(formatUtcTimestamp(undefined as unknown as Date)).toBe('');
    });

    it('should handle a string date input', () => {
        expect(formatUtcTimestamp('2024-06-15T14:30:00.000Z')).toBe('2024-06-15 14:30');
    });
});
