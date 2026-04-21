import { validateInit } from 'src/core/validation.util';
import { SubscriptionPlan } from './subscription-plan.enum';
import { ACTIVE_SUBSCRIPTION_STATUSES, SubscriptionStatus } from './subscription-status.enum';

export class Subscription {
    readonly id: number;
    readonly userId: number;
    readonly stripeCustomerId: string;
    readonly stripeSubscriptionId: string | null;
    readonly stripePriceId: string | null;
    readonly status: SubscriptionStatus;
    readonly plan: SubscriptionPlan | null;
    readonly currentPeriodEnd: Date | null;
    readonly cancelAtPeriodEnd: boolean;

    constructor(init: Partial<Subscription>) {
        validateInit(init, ['userId', 'stripeCustomerId', 'status']);
        this.id = init.id;
        this.userId = init.userId;
        this.stripeCustomerId = init.stripeCustomerId;
        this.stripeSubscriptionId = init.stripeSubscriptionId ?? null;
        this.stripePriceId = init.stripePriceId ?? null;
        this.status = init.status;
        this.plan = init.plan ?? null;
        this.currentPeriodEnd = init.currentPeriodEnd ?? null;
        this.cancelAtPeriodEnd = init.cancelAtPeriodEnd ?? false;
    }

    isActive(): boolean {
        return ACTIVE_SUBSCRIPTION_STATUSES.has(this.status);
    }
}
