/**
 * Wraps raw merchant URLs in affiliate tracking URLs.
 *
 * TCGPlayer uses Impact. Impact produces two interchangeable link shapes:
 *   - Shortlink:  https://partner.tcgplayer.com/PzKzOM
 *   - Deep link:  https://partner.tcgplayer.com/c/{partnerId}/{campaignId}/{creativeId}
 * Both accept `?u={encoded destination}` to send the click to a specific page.
 *
 * Config: set `TCGPLAYER_AFFILIATE_URL` to whichever link Impact gave you.
 * When unset or blank the raw URL is returned unchanged, so local dev and
 * preview environments still link to TCGPlayer (without attribution).
 */
export class AffiliateLinkPolicy {
    static wrapTcgplayer(rawUrl: string | null | undefined): string | undefined {
        const trimmed = rawUrl?.trim();
        if (!trimmed) return undefined;

        const base = process.env.TCGPLAYER_AFFILIATE_URL?.trim();
        if (!base) return trimmed;

        const normalized = base.replace(/\/+$/, '');
        const separator = normalized.includes('?') ? '&' : '?';
        return `${normalized}${separator}u=${encodeURIComponent(trimmed)}`;
    }
}
