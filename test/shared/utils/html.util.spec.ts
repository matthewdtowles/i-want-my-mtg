import { escapeHtml } from 'src/shared/utils/html.util';

describe('escapeHtml', () => {
    it('should escape ampersand', () => {
        expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape angle brackets', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('should escape single quotes', () => {
        expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('should return plain text unchanged', () => {
        expect(escapeHtml('Test Angel')).toBe('Test Angel');
    });

    it('should handle empty string', () => {
        expect(escapeHtml('')).toBe('');
    });
});
