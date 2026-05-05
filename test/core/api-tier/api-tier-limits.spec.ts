import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { API_TIER_LIMITS, getTierLimits } from 'src/core/api-tier/api-tier-limits';

describe('API tier limits', () => {
    it('defines per-day and per-minute limits for every tier', () => {
        for (const tier of Object.values(ApiTier)) {
            const limits = API_TIER_LIMITS[tier];
            expect(limits.perDay).toBeGreaterThan(0);
            expect(limits.perMinute).toBeGreaterThan(0);
        }
    });

    it('orders tiers by ascending capacity', () => {
        expect(API_TIER_LIMITS[ApiTier.Free].perDay).toBeLessThan(API_TIER_LIMITS[ApiTier.Developer].perDay);
        expect(API_TIER_LIMITS[ApiTier.Developer].perDay).toBeLessThan(API_TIER_LIMITS[ApiTier.Business].perDay);
        expect(API_TIER_LIMITS[ApiTier.Free].perMinute).toBeLessThan(API_TIER_LIMITS[ApiTier.Developer].perMinute);
        expect(API_TIER_LIMITS[ApiTier.Developer].perMinute).toBeLessThan(API_TIER_LIMITS[ApiTier.Business].perMinute);
    });

    it('matches roadmap-published values', () => {
        expect(API_TIER_LIMITS[ApiTier.Free].perDay).toBe(100);
        expect(API_TIER_LIMITS[ApiTier.Developer].perDay).toBe(5000);
        expect(API_TIER_LIMITS[ApiTier.Business].perDay).toBe(50000);
    });

    it('getTierLimits returns the same object as the map', () => {
        expect(getTierLimits(ApiTier.Free)).toBe(API_TIER_LIMITS[ApiTier.Free]);
    });
});
