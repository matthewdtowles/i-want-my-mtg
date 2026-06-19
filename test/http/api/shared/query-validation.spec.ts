import { SET_CARD_SORTS, SortOptions, TRANSACTION_SORTS } from 'src/core/query/sort-options.enum';
import { InvalidQueryParamException, validateApiQuery } from 'src/http/api/shared/query-validation';

const ALL_FLAGS = {
    sort: SET_CARD_SORTS,
    rarity: true,
    format: true,
    legality: true,
    setCode: true,
    transactionType: true,
    groupBy: true,
};

describe('validateApiQuery', () => {
    describe('valid values pass', () => {
        it('accepts a fully valid query', () => {
            expect(() =>
                validateApiQuery(
                    {
                        sort: SortOptions.CARD,
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
                    {
                        rarity: 'COMMON',
                        format: 'Standard',
                        legality: 'Legal',
                        type: 'sell',
                    },
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

        it('rejects an unknown legality value', () => {
            const err = capture({ legality: 'maybe', format: 'modern' }, ALL_FLAGS);
            expect(err.param).toBe('legality');
            expect(err.allowedValues).toEqual(['legal', 'banned', 'restricted']);
        });

        it('rejects an invalid transaction type', () => {
            const err = capture({ type: 'BOUGHT' }, { transactionType: true });
            expect(err.param).toBe('type');
            expect(err.allowedValues).toEqual(['BUY', 'SELL']);
        });

        it('accepts a whitespace-padded transaction type (reuses parseTransactionType)', () => {
            // parseTransactionType trims, and it is the same gate the controller
            // filters with, so the validator must accept what the filter accepts.
            expect(() =>
                validateApiQuery({ type: '  sell  ' }, { transactionType: true })
            ).not.toThrow();
        });

        it('rejects a malformed setCode without an allowedValues list', () => {
            const err = capture({ setCode: 'mh-3' }, { setCode: true });
            expect(err.param).toBe('setCode');
            expect(err.allowedValues).toBeUndefined();
            expect(err.message).toContain('letters and digits');
        });

        it('rejects an unknown groupBy with the allowed value list', () => {
            const err = capture({ groupBy: 'foo' }, { groupBy: true });
            expect(err.param).toBe('groupBy');
            expect(err.allowedValues).toEqual(['name']);
        });

        it('rejects a case-mismatched groupBy (must equal "name" exactly)', () => {
            const err = capture({ groupBy: 'Name' }, { groupBy: true });
            expect(err.param).toBe('groupBy');
        });
    });

    describe('repeated (array) query params', () => {
        it('400s a param parsed as an array instead of throwing a 500', () => {
            const err = capture({ setCode: ['mh3', 'lea'] }, { setCode: true });
            expect(err.param).toBe('setCode');
            expect(err.message).toContain('single value');
        });

        it('does not choke on an array for a param the endpoint ignores', () => {
            expect(() => validateApiQuery({ filter: ['a', 'b'] }, { setCode: true })).not.toThrow();
        });
    });

    describe('legality requires format', () => {
        it('400s legality when format is absent', () => {
            const err = capture({ legality: 'banned' }, { legality: true });
            expect(err.param).toBe('legality');
            expect(err.allowedValues).toBeUndefined();
            expect(err.message).toContain('format');
        });

        it('accepts legality when format is present', () => {
            expect(() =>
                validateApiQuery({ legality: 'banned', format: 'modern' }, ALL_FLAGS)
            ).not.toThrow();
        });
    });

    describe('endpoint-scoped sort', () => {
        it('accepts a sort the endpoint can honor', () => {
            expect(() =>
                validateApiQuery({ sort: SortOptions.TX_DATE }, { sort: TRANSACTION_SORTS })
            ).not.toThrow();
        });

        it('400s a globally-valid sort the endpoint cannot honor', () => {
            // card.name is a real SortOptions value but not joinable by the
            // transaction query - this used to 500, now it 400s.
            const err = capture({ sort: SortOptions.CARD }, { sort: TRANSACTION_SORTS });
            expect(err.param).toBe('sort');
            expect(err.allowedValues).toEqual([...TRANSACTION_SORTS]);
            expect(err.message).toContain(SortOptions.CARD);
        });

        it('400s a sort that is not a SortOptions value at all', () => {
            expect(() =>
                validateApiQuery({ sort: 'card.bogus' }, { sort: SET_CARD_SORTS })
            ).toThrow(InvalidQueryParamException);
        });

        it('does not validate sort when the endpoint passes no sort set', () => {
            expect(() => validateApiQuery({ sort: 'anything' }, { rarity: true })).not.toThrow();
        });
    });

    describe('flag gating', () => {
        it('does not validate a filter the endpoint does not consume', () => {
            expect(() =>
                validateApiQuery({ rarity: 'foobar' }, { sort: SET_CARD_SORTS })
            ).not.toThrow();
            expect(() =>
                validateApiQuery({ type: 'BOUGHT' }, { sort: SET_CARD_SORTS, rarity: true })
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
    query: Record<string, unknown>,
    flags: Parameters<typeof validateApiQuery>[1]
): InvalidQueryParamException {
    try {
        validateApiQuery(query, flags);
    } catch (e) {
        return e as InvalidQueryParamException;
    }
    throw new Error('expected validateApiQuery to throw');
}
