/**
 * Free-tier feature caps. Centralized so gating sites stay consistent.
 */
export const FREE_TIER_HISTORY_DAYS = 30;

/**
 * Returns the earliest date a free-tier user can see in time-windowed history
 * views (transactions, price history). Computed at call-time so the window
 * slides forward each day.
 */
export function freeTierHistoryCutoff(now: Date = new Date()): Date {
    const cutoff = new Date(now);
    cutoff.setUTCHours(0, 0, 0, 0);
    cutoff.setUTCDate(cutoff.getUTCDate() - FREE_TIER_HISTORY_DAYS);
    return cutoff;
}
