import {
    AffiliateLinkPolicy,
    TCGPLAYER_PRODUCT_URL_TEMPLATE,
} from 'src/core/affiliate/affiliate-link.policy';

describe('AffiliateLinkPolicy', () => {
    describe('TCGPLAYER_PRODUCT_URL_TEMPLATE', () => {
        it('contains exactly one {id} placeholder and points at tcgplayer.com', () => {
            const matches = TCGPLAYER_PRODUCT_URL_TEMPLATE.match(/\{id\}/g) || [];
            expect(matches).toHaveLength(1);
            expect(TCGPLAYER_PRODUCT_URL_TEMPLATE).toMatch(/^https:\/\/www\.tcgplayer\.com\//);
        });
    });

    describe('buildTcgplayerLink', () => {
        it('returns undefined when productId is null/undefined/empty/whitespace', () => {
            expect(AffiliateLinkPolicy.buildTcgplayerLink(undefined)).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink(null)).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink('')).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink('   ')).toBeUndefined();
        });

        it('wraps the product URL in the Impact partner shortlink', () => {
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(productUrl)
            );
        });

        it('URL-encodes the product id before substitution', () => {
            const link = AffiliateLinkPolicy.buildTcgplayerLink('a b/c?d');
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace(
                '{id}',
                encodeURIComponent('a b/c?d')
            );
            expect(link).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(productUrl)
            );
        });

        it('trims whitespace from the productId', () => {
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            expect(AffiliateLinkPolicy.buildTcgplayerLink('  672033  ')).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(productUrl)
            );
        });
    });
});
