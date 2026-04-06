/**
 * Builds the path portion of a card URL.
 * Use this everywhere card links are constructed to ensure consistency.
 */
export function buildCardUrl(setCode: string, number: string): string {
    return `/card/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(number)}`;
}
