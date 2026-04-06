import { buildCardUrl } from 'src/http/base/http.util';

describe('buildCardUrl', () => {
    it('should build url with lowercase setCode', () => {
        expect(buildCardUrl('MH3', '42')).toBe('/card/mh3/42');
    });

    it('should handle already-lowercase setCode', () => {
        expect(buildCardUrl('mh3', '42')).toBe('/card/mh3/42');
    });

    it('should handle mixed-case setCode', () => {
        expect(buildCardUrl('Mh3', '42')).toBe('/card/mh3/42');
    });

    it('should handle collector numbers with letters', () => {
        expect(buildCardUrl('MH3', '42a')).toBe('/card/mh3/42a');
    });

    it('should handle collector numbers with special characters', () => {
        expect(buildCardUrl('TST', '★123')).toBe('/card/tst/%E2%98%85123');
    });
});
