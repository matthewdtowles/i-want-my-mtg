/**
 * Builds TCGPlayer purchase links from a product ID and wraps them in our
 * Impact affiliate shortlink.
 *
 * MTGJSON's `purchaseUrls.tcgplayer` is an `mtgjson.com/links/...` redirect,
 * so wrapping that would credit MTGJSON, not us. Instead we go straight to
 * tcgplayer.com using the product ID and let Impact attribute the click via
 * `?u={encoded destination}` on the partner shortlink.
 */
export const TCGPLAYER_PRODUCT_URL_TEMPLATE =
    'https://www.tcgplayer.com/product/{id}/-?Language=English&page=1';

const TCGPLAYER_AFFILIATE_BASE = 'https://partner.tcgplayer.com/PzKzOM';

export class AffiliateLinkPolicy {
    static buildTcgplayerLink(productId: string | null | undefined): string | undefined {
        const id = productId?.trim();
        if (!id) return undefined;

        const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace(
            '{id}',
            encodeURIComponent(id)
        );
        return `${TCGPLAYER_AFFILIATE_BASE}?u=${encodeURIComponent(productUrl)}`;
    }
}
