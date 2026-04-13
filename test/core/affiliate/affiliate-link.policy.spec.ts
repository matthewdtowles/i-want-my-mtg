import { AffiliateLinkPolicy } from 'src/core/affiliate/affiliate-link.policy';

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

    describe('wrapTcgplayer', () => {
        it('returns undefined when rawUrl is null/undefined/empty', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';

            expect(AffiliateLinkPolicy.wrapTcgplayer(undefined)).toBeUndefined();
            expect(AffiliateLinkPolicy.wrapTcgplayer(null)).toBeUndefined();
            expect(AffiliateLinkPolicy.wrapTcgplayer('')).toBeUndefined();
            expect(AffiliateLinkPolicy.wrapTcgplayer('   ')).toBeUndefined();
        });

        it('returns rawUrl unchanged when TCGPLAYER_AFFILIATE_URL is missing or empty', () => {
            const raw = 'https://www.tcgplayer.com/product/12345/magic-foo';

            expect(AffiliateLinkPolicy.wrapTcgplayer(raw)).toBe(raw);

            process.env.TCGPLAYER_AFFILIATE_URL = '';
            expect(AffiliateLinkPolicy.wrapTcgplayer(raw)).toBe(raw);

            process.env.TCGPLAYER_AFFILIATE_URL = '   ';
            expect(AffiliateLinkPolicy.wrapTcgplayer(raw)).toBe(raw);
        });

        it('appends ?u={encoded destination} to an Impact shortlink', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';

            const raw = 'https://tcgplayer.com/search/magic/product.html';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(raw)
            );
        });

        it('appends ?u={encoded destination} to a full /c/.../.../... deep link', () => {
            process.env.TCGPLAYER_AFFILIATE_URL =
                'https://partner.tcgplayer.com/c/abc123/1830156/21018';

            const raw = 'https://tcgplayer.com/product/1';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toBe(
                'https://partner.tcgplayer.com/c/abc123/1830156/21018?u=' +
                    encodeURIComponent(raw)
            );
        });

        it('strips a trailing slash from the base URL before appending', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM/';

            const raw = 'https://tcgplayer.com/product/1';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' + encodeURIComponent(raw)
            );
        });

        it('uses & instead of ? when the base URL already has a query string', () => {
            process.env.TCGPLAYER_AFFILIATE_URL =
                'https://partner.tcgplayer.com/PzKzOM?sharedid=foo';

            const raw = 'https://tcgplayer.com/product/1';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toBe(
                'https://partner.tcgplayer.com/PzKzOM?sharedid=foo&u=' +
                    encodeURIComponent(raw)
            );
        });

        it('encodes URLs with query strings and special characters', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';

            const raw = 'https://www.tcgplayer.com/product/12345?foo=bar&baz=qux';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toContain('?u=');
            expect(wrapped).toContain(encodeURIComponent('?foo=bar&baz=qux'));
            expect(wrapped.startsWith('https://partner.tcgplayer.com/PzKzOM?u=')).toBe(true);
        });

        it('trims whitespace from rawUrl before wrapping', () => {
            process.env.TCGPLAYER_AFFILIATE_URL = 'https://partner.tcgplayer.com/PzKzOM';

            const raw = '  https://tcgplayer.com/product/1  ';
            const wrapped = AffiliateLinkPolicy.wrapTcgplayer(raw);

            expect(wrapped).toBe(
                'https://partner.tcgplayer.com/PzKzOM?u=' +
                    encodeURIComponent('https://tcgplayer.com/product/1')
            );
        });
    });
});
