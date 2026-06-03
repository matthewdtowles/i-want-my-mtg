import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Format } from 'src/core/card/format.enum';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';

describe('SafeQueryOptions — public catalog filters', () => {
    describe('array (repeated) query params', () => {
        it('does not throw on array values and treats them as not provided', () => {
            // Express/qs parses `?setCode=a&setCode=b` as an array; the sanitizers
            // must not call string methods on it (would 500). HBS callers stay lenient.
            const raw = {
                setCode: ['a', 'b'],
                rarity: ['common', 'mythic'],
                format: ['modern'],
                legality: ['legal'],
                filter: ['x', 'y'],
                sort: ['card.name'],
                type: ['BUY'],
                baseOnly: ['true'],
            } as never;
            const opts = new SafeQueryOptions(raw);
            expect(opts.setCode).toBeUndefined();
            expect(opts.rarity).toBeUndefined();
            expect(opts.format).toBeUndefined();
            expect(opts.filter).toBeUndefined();
            expect(opts.sort).toBeUndefined();
            expect(opts.type).toBeUndefined();
            // numeric/boolean params fall back to their defaults
            expect(opts.limit).toBe(25);
            expect(opts.page).toBe(1);
        });
    });

    describe('setCode', () => {
        it('lowercases set codes to match DB storage convention', () => {
            const opts = new SafeQueryOptions({ setCode: 'LEA' });
            expect(opts.setCode).toBe('lea');
        });

        it('strips non-alphanumeric characters', () => {
            const opts = new SafeQueryOptions({ setCode: 'le<a>' });
            expect(opts.setCode).toBe('lea');
        });

        it('returns undefined when input has no alphanumerics', () => {
            const opts = new SafeQueryOptions({ setCode: '<<>>' });
            expect(opts.setCode).toBeUndefined();
        });

        it('is undefined when not provided', () => {
            const opts = new SafeQueryOptions({});
            expect(opts.setCode).toBeUndefined();
        });
    });

    describe('rarity', () => {
        it.each(['common', 'uncommon', 'rare', 'mythic'])('accepts %s', (value) => {
            const opts = new SafeQueryOptions({ rarity: value });
            expect(opts.rarity).toBe(value as CardRarity);
        });

        it('lowercases incoming values', () => {
            const opts = new SafeQueryOptions({ rarity: 'RARE' });
            expect(opts.rarity).toBe(CardRarity.Rare);
        });

        it('drops unknown values', () => {
            const opts = new SafeQueryOptions({ rarity: 'epic' });
            expect(opts.rarity).toBeUndefined();
        });

        it('does not expose bonus/special even though enum has them (catalog scope)', () => {
            const bonus = new SafeQueryOptions({ rarity: 'bonus' });
            expect(bonus.rarity).toBeUndefined();
            const special = new SafeQueryOptions({ rarity: 'special' });
            expect(special.rarity).toBeUndefined();
        });
    });

    describe('type', () => {
        it('accepts substring text and trims it', () => {
            const opts = new SafeQueryOptions({ type: '  creature ' });
            expect(opts.type).toBe('creature');
        });

        it('strips characters outside [a-zA-Z0-9 -]', () => {
            const opts = new SafeQueryOptions({ type: 'creature; DROP TABLE' });
            expect(opts.type).toBe('creature DROP TABLE');
        });

        it('is undefined when blank after sanitizing', () => {
            const opts = new SafeQueryOptions({ type: '$$$' });
            expect(opts.type).toBeUndefined();
        });
    });

    describe('format / legality', () => {
        it.each(Object.values(Format))('accepts format %s', (format) => {
            const opts = new SafeQueryOptions({ format });
            expect(opts.format).toBe(format);
        });

        it('rejects unknown formats', () => {
            const opts = new SafeQueryOptions({ format: 'arena' });
            expect(opts.format).toBeUndefined();
        });

        it('defaults legality to "legal" when format is set and legality is absent', () => {
            const opts = new SafeQueryOptions({ format: Format.Standard });
            expect(opts.legality).toBe(LegalityStatus.Legal);
        });

        it.each(Object.values(LegalityStatus))(
            'accepts explicit legality %s when format is also set',
            (status) => {
                const opts = new SafeQueryOptions({
                    format: Format.Standard,
                    legality: status,
                });
                expect(opts.legality).toBe(status);
            }
        );

        it('ignores legality when format is missing (filter is meaningless alone)', () => {
            const opts = new SafeQueryOptions({ legality: 'banned' });
            expect(opts.legality).toBeUndefined();
            expect(opts.format).toBeUndefined();
        });

        it('rejects unknown legality values', () => {
            const opts = new SafeQueryOptions({
                format: Format.Standard,
                legality: 'maybe',
            });
            expect(opts.legality).toBe(LegalityStatus.Legal);
        });
    });

    describe('withBaseOnly', () => {
        it('preserves new filter fields across withBaseOnly()', () => {
            const opts = new SafeQueryOptions({
                setCode: 'lea',
                rarity: 'rare',
                type: 'creature',
                format: Format.Modern,
                legality: LegalityStatus.Banned,
                baseOnly: 'true',
            }).withBaseOnly(false);
            expect(opts.setCode).toBe('lea');
            expect(opts.rarity).toBe(CardRarity.Rare);
            expect(opts.type).toBe('creature');
            expect(opts.format).toBe(Format.Modern);
            expect(opts.legality).toBe(LegalityStatus.Banned);
            expect(opts.baseOnly).toBe(false);
        });

        it('preserves includedSetTypes across withBaseOnly()', () => {
            const opts = new SafeQueryOptions(
                { baseOnly: 'true' },
                { includedSetTypes: ['expansion', 'core'] }
            ).withBaseOnly(false);
            expect(opts.includedSetTypes).toEqual(['expansion', 'core']);
        });
    });

    describe('includedSetTypes / withSetTypes', () => {
        it('defaults includedSetTypes to null when no extra is provided', () => {
            const opts = new SafeQueryOptions({});
            expect(opts.includedSetTypes).toBeNull();
        });

        it('stores includedSetTypes from constructor extra arg', () => {
            const opts = new SafeQueryOptions({}, { includedSetTypes: ['expansion', 'commander'] });
            expect(opts.includedSetTypes).toEqual(['expansion', 'commander']);
        });

        it('withSetTypes() sets the field on the new instance', () => {
            const opts = new SafeQueryOptions({}).withSetTypes(['draft_innovation']);
            expect(opts.includedSetTypes).toEqual(['draft_innovation']);
        });

        it('withSetTypes(null) clears the field', () => {
            const opts = new SafeQueryOptions({}, { includedSetTypes: ['expansion'] }).withSetTypes(
                null
            );
            expect(opts.includedSetTypes).toBeNull();
        });

        it('withSetTypes() preserves other filter fields', () => {
            const opts = new SafeQueryOptions({
                setCode: 'lea',
                rarity: 'rare',
                type: 'creature',
                format: Format.Modern,
                legality: LegalityStatus.Banned,
                baseOnly: 'true',
            }).withSetTypes(['expansion']);
            expect(opts.setCode).toBe('lea');
            expect(opts.rarity).toBe(CardRarity.Rare);
            expect(opts.type).toBe('creature');
            expect(opts.format).toBe(Format.Modern);
            expect(opts.legality).toBe(LegalityStatus.Banned);
            expect(opts.baseOnly).toBe(true);
            expect(opts.includedSetTypes).toEqual(['expansion']);
        });
    });
});
