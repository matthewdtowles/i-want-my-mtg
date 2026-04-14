import {
    AffiliateLinkPolicy,
    TCGPLAYER_PRODUCT_URL_TEMPLATE,
} from 'src/core/affiliate/affiliate-link.policy';

describe('AffiliateLinkPolicy', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
        delete process.env.TCGPLAYER_AFFILIATE_URL;
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('TCGPLAYER_PRODUCT_URL_TEMPLATE', () => {
        it('contains exactly one {id} placeholder and points at tcgplayer.com', () => {
            const matches = TCGPLAYER_PRODUCT_URL_TEMPLATE.match(/\{id\}/g) || [];
            expect(matches).toHaveLength(1);
            expect(TCGPLAYER_PRODUCT_URL_TEMPLATE).toMatch(/^https:\/\/www\.tcgplayer\.com\//);
        });
    });

    describe('buildTcgplayerLink', () => {
        it('returns undefined when productId is null/undefined/empty/whitespace', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';
            expect(AffiliateLinkPolicy.buildTcgplayerLink(undefined)).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink(null)).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink('')).toBeUndefined();
            expect(AffiliateLinkPolicy.buildTcgplayerLink('   ')).toBeUndefined();
        });

        it('returns the bare product URL when TCGPLAYER_AFFILIATE_URL is missing or blank', () => {
            const expected = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');

            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(expected);

            process.env.TCGPLAYER_AFFILIATE_URL = '';
            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(expected);

            process.env.TCGPLAYER_AFFILIATE_URL = '   ';
            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(expected);
        });

        it('wraps the product URL in an Impact shortlink when env is set', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');

            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(productUrl)
            );
        });

        it('wraps the product URL in a deep-link affiliate URL', () => {
            process.env.TCGPLAYER_AFFILIATE_URL =
                'https://partner.tcgplayer.com/c/abc123/1830156/21018';
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');

            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(
                'https://partner.tcgplayer.com/c/abc123/1830156/21018?u=' +
                    encodeURIComponent(productUrl)
            );
        });

        it('strips a trailing slash from the affiliate base before appending', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM/';
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');

            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(productUrl)
            );
        });

        it('uses & instead of ? when the affiliate base already has a query string', () => {
            process.env.TCGPLAYER_AFFILIATE_URL =
                'https://partner.tcgplayer.com/PzKzOM?sharedid=foo';
            const productUrl = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');

            expect(AffiliateLinkPolicy.buildTcgplayerLink('672033')).toBe(
                'https://partner.tcgplayer.com/PzKzOM?sharedid=foo&u=' +
                    encodeURIComponent(productUrl)
            );
        });

        it('URL-encodes the product id before substitution', () => {
            const link = AffiliateLinkPolicy.buildTcgplayerLink('a b/c?d');

            expect(link).toBe(
                TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', encodeURIComponent('a b/c?d'))
            );
        });

        it('trims whitespace from the productId', () => {
            const expected = TCGPLAYER_PRODUCT_URL_TEMPLATE.replace('{id}', '672033');
            expect(AffiliateLinkPolicy.buildTcgplayerLink('  672033  ')).toBe(expected);
        });
    });
});
