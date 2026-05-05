import { ACTIVE_SUBSCRIPTION_STATUSES, SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { validateInit } from 'src/core/validation.util';
import { ApiTier } from './api-tier.enum';

export class ApiSubscription {
    readonly id: number | null;
    readonly userId: number;
    readonly tier: ApiTier;
    readonly stripeCustomerId: string | null;
    readonly stripeSubscriptionId: string | null;
    readonly stripePriceId: string | null;
    readonly status: SubscriptionStatus | null;
    readonly currentPeriodEnd: Date | null;
    readonly cancelAtPeriodEnd: boolean;

    constructor(init: Partial<ApiSubscription>) {
        validateInit(init, ['userId', 'tier']);
        this.id = init.id ?? null;
        this.userId = init.userId;
        this.tier = init.tier;
        this.stripeCustomerId = init.stripeCustomerId ?? null;
        this.stripeSubscriptionId = init.stripeSubscriptionId ?? null;
        this.stripePriceId = init.stripePriceId ?? null;
        this.status = init.status ?? null;
        this.currentPeriodEnd = init.currentPeriodEnd ?? null;
        this.cancelAtPeriodEnd = init.cancelAtPeriodEnd ?? false;
    }

    isActive(): boolean {
        return this.status !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(this.status);
    }

    effectiveTier(): ApiTier {
        return this.tier === ApiTier.Free || this.isActive() ? this.tier : ApiTier.Free;
    }
}
