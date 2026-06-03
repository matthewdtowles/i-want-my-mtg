import {
    InvalidQueryParamException,
    validateApiQuery,
} from 'src/http/api/shared/query-validation';

const ALL_FLAGS = {
    sort: true,
    rarity: true,
    format: true,
    legality: true,
    setCode: true,
    transactionType: true,
};

describe('validateApiQuery', () => {
    describe('valid values pass', () => {
        it('accepts a fully valid query', () => {
            expect(() =>
                validateApiQuery(
                    {
                        sort: 'card.name',
                        rarity: 'rare',
                        format: 'modern',
                        legality: 'banned',
                        setCode: 'mh3',
                        type: 'BUY',
                    },
                    ALL_FLAGS
                )
            ).not.toThrow();
        });

        it('treats absent and empty values as "not provided"', () => {
            expect(() => validateApiQuery({}, ALL_FLAGS)).not.toThrow();
            expect(() =>
                validateApiQuery(
                    { sort: '', rarity: '   ', format: undefined, setCode: '' },
                    ALL_FLAGS
                )
            ).not.toThrow();
        });

        it('is case-insensitive for rarity, format, legality, and type', () => {
            expect(() =>
                validateApiQuery(
                    { rarity: 'COMMON', format: 'Standard', legality: 'Legal', type: 'sell' },
                    ALL_FLAGS
                )
            ).not.toThrow();
        });

        it('trims surrounding whitespace on setCode', () => {
            expect(() => validateApiQuery({ setCode: '  mh3  ' }, { setCode: true })).not.toThrow();
        });
    });

    describe('invalid values throw 400 with the offending param and allowed values', () => {
        it('rejects an unknown rarity', () => {
            try {
                validateApiQuery({ rarity: 'foobar' }, ALL_FLAGS);
                fail('expected throw');
            } catch (e) {
                expect(e).toBeInstanceOf(InvalidQueryParamException);
                const err = e as InvalidQueryParamException;
                expect(err.getStatus()).toBe(400);
                expect(err.param).toBe('rarity');
                expect(err.allowedValues).toEqual(['common', 'uncommon', 'rare', 'mythic']);
                expect(err.message).toContain("Invalid value 'foobar'");
                expect(err.message).toContain('common, uncommon, rare, mythic');
            }
        });

        it('rejects a non-public rarity (bonus/special)', () => {
            expect(() => validateApiQuery({ rarity: 'bonus' }, { rarity: true })).toThrow(
                InvalidQueryParamException
            );
        });

        it('rejects an unknown format', () => {
            const err = capture({ format: 'pioneerish' }, { format: true });
            expect(err.param).toBe('format');
            expect(err.allowedValues).toContain('pioneer');
        });

        it('rejects an unknown legality', () => {
            const err = capture({ legality: 'maybe' }, { legality: true });
            expect(err.param).toBe('legality');
            expect(err.allowedValues).toEqual(['legal', 'banned', 'restricted']);
        });

        it('rejects an unknown sort key', () => {
            const err = capture({ sort: 'card.bogus' }, { sort: true });
            expect(err.param).toBe('sort');
            expect(err.allowedValues).toContain('card.name');
        });

        it('rejects sort by enum name rather than value (exact match)', () => {
            expect(() => validateApiQuery({ sort: 'CARD' }, { sort: true })).toThrow(
                InvalidQueryParamException
            );
        });

        it('rejects an invalid transaction type', () => {
            const err = capture({ type: 'BOUGHT' }, { transactionType: true });
            expect(err.param).toBe('type');
            expect(err.allowedValues).toEqual(['BUY', 'SELL']);
        });

        it('rejects a malformed setCode without an allowedValues list', () => {
            const err = capture({ setCode: 'mh-3' }, { setCode: true });
            expect(err.param).toBe('setCode');
            expect(err.allowedValues).toBeUndefined();
            expect(err.message).toContain('letters and digits');
        });
    });

    describe('flag gating', () => {
        it('does not validate a filter the endpoint does not consume', () => {
            expect(() => validateApiQuery({ rarity: 'foobar' }, { sort: true })).not.toThrow();
            expect(() =>
                validateApiQuery({ type: 'BOUGHT' }, { sort: true, rarity: true })
            ).not.toThrow();
        });
    });

    describe('multiple invalid params', () => {
        it('throws on setCode first by validation order', () => {
            const err = capture({ setCode: 'bad!', sort: 'nope' }, ALL_FLAGS);
            expect(err.param).toBe('setCode');
        });
    });
});

function capture(
    query: Record<string, string | undefined>,
    flags: Parameters<typeof validateApiQuery>[1]
): InvalidQueryParamException {
    try {
        validateApiQuery(query, flags);
    } catch (e) {
        return e as InvalidQueryParamException;
    }
    throw new Error('expected validateApiQuery to throw');
}
