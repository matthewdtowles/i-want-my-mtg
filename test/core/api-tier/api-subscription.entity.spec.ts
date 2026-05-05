import { ApiSubscription } from 'src/core/api-tier/api-subscription.entity';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';

describe('ApiSubscription entity', () => {
    it('requires userId and tier', () => {
        expect(() => new ApiSubscription({ tier: ApiTier.Free })).toThrow(/userId/);
        expect(() => new ApiSubscription({ userId: 1 })).toThrow(/tier/);
    });

    it('isActive only when status is active or trialing', () => {
        const make = (status: SubscriptionStatus | null) =>
            new ApiSubscription({ userId: 1, tier: ApiTier.Developer, status });
        expect(make(SubscriptionStatus.Active).isActive()).toBe(true);
        expect(make(SubscriptionStatus.Trialing).isActive()).toBe(true);
        expect(make(SubscriptionStatus.PastDue).isActive()).toBe(false);
        expect(make(null).isActive()).toBe(false);
    });

    it('effectiveTier returns Free for paid tiers without active status', () => {
        const inactiveDeveloper = new ApiSubscription({
            userId: 1,
            tier: ApiTier.Developer,
            status: SubscriptionStatus.PastDue,
        });
        expect(inactiveDeveloper.effectiveTier()).toBe(ApiTier.Free);
    });

    it('effectiveTier returns the configured tier when active', () => {
        const activeBusiness = new ApiSubscription({
            userId: 1,
            tier: ApiTier.Business,
            status: SubscriptionStatus.Active,
        });
        expect(activeBusiness.effectiveTier()).toBe(ApiTier.Business);
    });

    it('Free tier is always effective regardless of status', () => {
        const free = new ApiSubscription({ userId: 1, tier: ApiTier.Free });
        expect(free.effectiveTier()).toBe(ApiTier.Free);
    });
});
