import { MoxfieldCsvParser } from 'src/core/import/parsers/moxfield-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const MOXFIELD_HEADER =
    '"Count","Tradelist Count","Name","Edition","Condition","Language","Foil","Tags","Last Modified","Collector Number","Alter","Proxy","Purchase Price"';

describe('MoxfieldCsvParser', () => {
    describe('matchesFormat', () => {
        it('recognizes a Moxfield header row', () => {
            expect(
                MoxfieldCsvParser.matchesFormat([
                    'Count',
                    'Tradelist Count',
                    'Name',
                    'Edition',
                    'Foil',
                    'Last Modified',
                    'Collector Number',
                ])
            ).toBe(true);
        });

        it('is case-insensitive and tolerates whitespace', () => {
            expect(
                MoxfieldCsvParser.matchesFormat([' TRADELIST COUNT ', 'last modified', 'Name'])
            ).toBe(true);
        });

        it('rejects the native IWMM header row', () => {
            expect(
                MoxfieldCsvParser.matchesFormat([
                    'id',
                    'name',
                    'set_code',
                    'number',
                    'quantity',
                    'foil',
                ])
            ).toBe(false);
        });

        it('rejects the Archidekt header row', () => {
            expect(
                MoxfieldCsvParser.matchesFormat([
                    'Quantity',
                    'Name',
                    'Finish',
                    'Edition Code',
                    'Collector Number',
                ])
            ).toBe(false);
        });

        it('rejects the Deckbox header row (no Last Modified)', () => {
            expect(
                MoxfieldCsvParser.matchesFormat([
                    'Count',
                    'Tradelist Count',
                    'Name',
                    'Edition',
                    'Card Number',
                ])
            ).toBe(false);
        });
    });

    describe('parse', () => {
        it('returns empty array for header-only file', () => {
            expect(MoxfieldCsvParser.parse(toBuffer(MOXFIELD_HEADER + '\n'))).toEqual([]);
        });

        it('maps Moxfield columns onto the import row shape', () => {
            const row =
                '"4","0","Lightning Bolt","MH3","Near Mint","en","","","2026-01-01 12:00","123","False","False","1.50"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed).toEqual({
                name: 'Lightning Bolt',
                set_code: 'mh3',
                number: '123',
                quantity: '4',
                foil: 'false',
            });
        });

        it('maps foil finish to foil=true', () => {
            const row =
                '"1","0","Brainstorm","EMA","Near Mint","en","foil","","2026-01-01","40","False","False","0"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('maps etched finish to foil=true', () => {
            const row =
                '"1","0","Command Tower","CMM","Near Mint","en","etched","","2026-01-01","50","False","False","0"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('maps glossy finish to foil=true', () => {
            const row =
                '"1","0","Sol Ring","CMM","Near Mint","en","glossy","","2026-01-01","99","False","False","0"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('lowercases the edition code', () => {
            const row =
                '"2","0","Counterspell","MH2","Near Mint","en","","","2026-01-01","267","False","False","0"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed.set_code).toBe('mh2');
        });

        it('treats blank quantity as undefined', () => {
            const row =
                '"","0","Ponder","M10","Near Mint","en","","","2026-01-01","79","False","False","0"';
            const [parsed] = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${row}\n`));
            expect(parsed.quantity).toBeUndefined();
        });

        it('does not cap rows; service applies MAX_IMPORT_ROWS', () => {
            const rows = Array.from(
                { length: 2100 },
                (_, i) =>
                    `"1","0","Card ${i}","MH3","Near Mint","en","","","2026-01-01","${i}","False","False","0"`
            ).join('\n');
            const result = MoxfieldCsvParser.parse(toBuffer(`${MOXFIELD_HEADER}\n${rows}\n`));
            expect(result.length).toBe(2100);
        });
    });
});
