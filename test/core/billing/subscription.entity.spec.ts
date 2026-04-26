import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { Subscription } from 'src/core/billing/subscription.entity';

describe('Subscription entity', () => {
    it('requires userId, stripeCustomerId, and status', () => {
        expect(
            () => new Subscription({ stripeCustomerId: 'cus_1', status: SubscriptionStatus.Active })
        ).toThrow(/userId/);
        expect(() => new Subscription({ userId: 1, status: SubscriptionStatus.Active })).toThrow(
            /stripeCustomerId/
        );
        expect(() => new Subscription({ userId: 1, stripeCustomerId: 'cus_1' })).toThrow(/status/);
    });

    it('isActive returns true for active and trialing', () => {
        const active = new Subscription({
            userId: 1,
            stripeCustomerId: 'cus_1',
            status: SubscriptionStatus.Active,
        });
        const trialing = new Subscription({
            userId: 1,
            stripeCustomerId: 'cus_1',
            status: SubscriptionStatus.Trialing,
        });
        expect(active.isActive()).toBe(true);
        expect(trialing.isActive()).toBe(true);
    });

    it('isActive returns false for past_due, canceled, incomplete', () => {
        for (const s of [
            SubscriptionStatus.PastDue,
            SubscriptionStatus.Canceled,
            SubscriptionStatus.Incomplete,
            SubscriptionStatus.Unpaid,
        ]) {
            const sub = new Subscription({ userId: 1, stripeCustomerId: 'cus_1', status: s });
            expect(sub.isActive()).toBe(false);
        }
    });

    it('defaults cancelAtPeriodEnd to false and nullable fields to null', () => {
        const sub = new Subscription({
            userId: 1,
            stripeCustomerId: 'cus_1',
            status: SubscriptionStatus.Active,
        });
        expect(sub.cancelAtPeriodEnd).toBe(false);
        expect(sub.stripeSubscriptionId).toBeNull();
        expect(sub.stripePriceId).toBeNull();
        expect(sub.plan).toBeNull();
        expect(sub.currentPeriodEnd).toBeNull();
    });
});
