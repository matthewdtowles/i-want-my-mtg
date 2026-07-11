// Longest history window any UI control requests (the "1y" button). "All" sends
// no `days`, so a caller asking for more than this is clamped rather than left
// to scan with an unbounded window.
export const MAX_HISTORY_DAYS = 365;

/**
 * Parse a `days` query parameter string into a positive integer (capped at
 * MAX_HISTORY_DAYS), or undefined.
 */
export function parseDaysParam(days?: string): number | undefined {
    if (!days) return undefined;
    const parsed = parseInt(days, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    if (String(parsed) !== days) return undefined;
    return Math.min(parsed, MAX_HISTORY_DAYS);
}
