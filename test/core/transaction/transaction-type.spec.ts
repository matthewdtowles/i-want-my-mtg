import { TRANSACTION_TYPES, parseTransactionType } from 'src/core/transaction/transaction.entity';

describe('parseTransactionType', () => {
    it('lists exactly BUY and SELL as the valid types', () => {
        expect(TRANSACTION_TYPES).toEqual(['BUY', 'SELL']);
    });

    it.each(['BUY', 'SELL', 'buy', 'sell', 'Buy'])('accepts %s case-insensitively', (input) => {
        expect(parseTransactionType(input)).toBe(input.toUpperCase());
    });

    it('trims surrounding whitespace', () => {
        expect(parseTransactionType('  sell  ')).toBe('SELL');
    });

    it('returns undefined for a typo', () => {
        expect(parseTransactionType('BOUGHT')).toBeUndefined();
    });

    it('returns undefined for a non-string (e.g. a repeated/array param)', () => {
        expect(parseTransactionType(['BUY', 'SELL'])).toBeUndefined();
        expect(parseTransactionType(undefined)).toBeUndefined();
    });
});
