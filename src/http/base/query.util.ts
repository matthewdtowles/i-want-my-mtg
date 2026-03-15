/**
 * Parse a `days` query parameter string into a positive integer, or undefined.
 */
export function parseDaysParam(days?: string): number | undefined {
    if (!days) return undefined;
    const parsed = parseInt(days, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    if (String(parsed) !== days) return undefined;
    return parsed;
}
