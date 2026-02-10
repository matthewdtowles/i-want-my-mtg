import {
    generateVerificationToken,
    getTokenExpiration,
} from 'src/core/auth/verification-token.util';

describe('verification-token.util', () => {
    describe('generateVerificationToken', () => {
        it('should return a 64-character hex string', () => {
            const token = generateVerificationToken();

            expect(token).toHaveLength(64);
            expect(token).toMatch(/^[0-9a-f]{64}$/);
        });

        it('should generate unique tokens on successive calls', () => {
            const tokens = new Set(Array.from({ length: 100 }, () => generateVerificationToken()));

            expect(tokens.size).toBe(100);
        });
    });

    describe('getTokenExpiration', () => {
        it('should default to 24 hours from now', () => {
            const before = new Date();
            const expiration = getTokenExpiration();
            const after = new Date();

            const expectedMin = new Date(before);
            expectedMin.setHours(expectedMin.getHours() + 24);

            const expectedMax = new Date(after);
            expectedMax.setHours(expectedMax.getHours() + 24);

            expect(expiration.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(expiration.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
        });

        it('should respect custom hour values', () => {
            const before = new Date();
            const expiration = getTokenExpiration(1);
            const after = new Date();

            const expectedMin = new Date(before);
            expectedMin.setHours(expectedMin.getHours() + 1);

            const expectedMax = new Date(after);
            expectedMax.setHours(expectedMax.getHours() + 1);

            expect(expiration.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(expiration.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
        });

        it('should handle zero hours', () => {
            const before = new Date();
            const expiration = getTokenExpiration(0);
            const after = new Date();

            expect(expiration.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(expiration.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should return a Date object', () => {
            const expiration = getTokenExpiration();

            expect(expiration).toBeInstanceOf(Date);
        });

        it('should handle large hour values', () => {
            const before = new Date();
            const expiration = getTokenExpiration(8760); // 1 year
            const after = new Date();

            const expectedMin = new Date(before);
            expectedMin.setHours(expectedMin.getHours() + 8760);

            const expectedMax = new Date(after);
            expectedMax.setHours(expectedMax.getHours() + 8760);

            expect(expiration.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
            expect(expiration.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
        });
    });
});
