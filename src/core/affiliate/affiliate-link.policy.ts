/**
 * Builds TCGPlayer purchase links from a product ID and wraps them in our
 * Impact affiliate URL.
 *
 * MTGJSON's `purchaseUrls.tcgplayer` is an `mtgjson.com/links/...` redirect,
 * so wrapping it would credit MTGJSON, not us. Instead we go straight to
 * tcgplayer.com using the product ID and let Impact attribute the click.
 *
 * The destination URL shape lives in one place: TCGPLAYER_PRODUCT_URL_TEMPLATE.
 * Impact accepts two interchangeable affiliate base shapes via TCGPLAYER_AFFILIATE_URL:
 *   - Shortlink:  https://partner.tcgplayer.com/PzKzOM
 *   - Deep link:  https://partner.tcgplayer.com/c/{partnerId}/{campaignId}/{creativeId}
 * Both accept `?u={encoded destination}`. When the env is unset (dev/preview),
 * the bare tcgplayer.com URL is returned so links still work without attribution.
 */
export const TCGPLAYER_PRODUCT_URL_TEMPLATE =
    'https://www.tcgplayer.com/product/{id}/-?Language=English&page=1';

export class AffiliateLinkPolicy {
    static buildTcgplayerLink(productId: string | null | undefined): string | undefined {
        const id = productId?.trim();
        if (!id) return undefined;

        const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace(
            '{id}',
            encodeURIComponent(id)
        );

        const base = process.env.TCGPLAYER_AFFILIATE_URL?.trim();
        if (!base) return productUrl;

        const normalized = base.replace(/\/+$/, '');
        const separator = normalized.includes('?') ? '&' : '?';
        return `${normalized}${separator}u=${encodeURIComponent(productUrl)}`;
    }
}
