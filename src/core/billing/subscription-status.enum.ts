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

/**
 * Parse a raw Stripe status string into a known SubscriptionStatus, or null if
 * it isn't one we model. Stripe can introduce statuses we don't yet handle;
 * persisting an arbitrary string makes isActive() behave unpredictably, so
 * callers validate first and fall back to a safe value (B13).
 */
export function parseSubscriptionStatus(raw: string): SubscriptionStatus | null {
    return (Object.values(SubscriptionStatus) as string[]).includes(raw)
        ? (raw as SubscriptionStatus)
        : null;
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
