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
