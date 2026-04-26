export enum SubscriptionStatus {
    Active = 'active',
    Trialing = 'trialing',
    PastDue = 'past_due',
    Canceled = 'canceled',
    Incomplete = 'incomplete',
    IncompleteExpired = 'incomplete_expired',
    Unpaid = 'unpaid',
    Paused = 'paused',
}

export const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
    SubscriptionStatus.Active,
    SubscriptionStatus.Trialing,
]);

export const BLOCKS_NEW_CHECKOUT_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
    SubscriptionStatus.Active,
    SubscriptionStatus.Trialing,
    SubscriptionStatus.PastDue,
    SubscriptionStatus.Unpaid,
]);
