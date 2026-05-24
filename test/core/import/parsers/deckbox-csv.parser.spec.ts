import { DeckboxCsvParser } from 'src/core/import/parsers/deckbox-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const DECKBOX_HEADER =
    '"Count","Tradelist Count","Name","Edition","Card Number","Condition","Language","Foil","Signed","Artist Proof","Altered Art","Misprint","Promo","Textless","My Price"';

describe('DeckboxCsvParser', () => {
    describe('matchesFormat', () => {
        it('recognizes a Deckbox header row', () => {
            expect(
                DeckboxCsvParser.matchesFormat([
                    'Count',
                    'Tradelist Count',
                    'Name',
                    'Edition',
                    'Card Number',
                    'Foil',
                ])
            ).toBe(true);
        });

        it('is case-insensitive and tolerates whitespace', () => {
            expect(
                DeckboxCsvParser.matchesFormat([' TRADELIST COUNT ', 'card number', 'Name'])
            ).toBe(true);
        });

        it('rejects the native IWMM header row', () => {
            expect(
                DeckboxCsvParser.matchesFormat([
                    'id',
                    'name',
                    'set_code',
                    'number',
                    'quantity',
                    'foil',
                ])
            ).toBe(false);
        });

        it('rejects the Moxfield header row (no Card Number)', () => {
            expect(
                DeckboxCsvParser.matchesFormat([
                    'Count',
                    'Tradelist Count',
                    'Name',
                    'Edition',
                    'Last Modified',
                    'Collector Number',
                ])
            ).toBe(false);
        });
    });

    describe('parse', () => {
        it('returns empty array for header-only file', () => {
            expect(DeckboxCsvParser.parse(toBuffer(DECKBOX_HEADER + '\n'))).toEqual([]);
        });

        it('maps Deckbox columns onto the import row shape with set_name', () => {
            const row =
                '"1","0","Lightning Bolt","Limited Edition Beta","162","Near Mint","English","","","","","","","","0.00"';
            const [parsed] = DeckboxCsvParser.parse(toBuffer(`${DECKBOX_HEADER}\n${row}\n`));
            expect(parsed).toEqual({
                name: 'Lightning Bolt',
                set_name: 'Limited Edition Beta',
                number: '162',
                quantity: '1',
                foil: 'false',
            });
        });

        it('maps foil to foil=true', () => {
            const row =
                '"1","0","Brainstorm","Eternal Masters","45","Near Mint","English","foil","","","","","","","0.00"';
            const [parsed] = DeckboxCsvParser.parse(toBuffer(`${DECKBOX_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('preserves edition name verbatim (not lowercased) for set lookup', () => {
            const row =
                '"4","0","Counterspell","Modern Horizons 2","267","Near Mint","English","","","","","","","","0.00"';
            const [parsed] = DeckboxCsvParser.parse(toBuffer(`${DECKBOX_HEADER}\n${row}\n`));
            expect(parsed.set_name).toBe('Modern Horizons 2');
            expect(parsed.set_code).toBeUndefined();
        });

        it('does not cap rows; service applies MAX_IMPORT_ROWS', () => {
            const rows = Array.from(
                { length: 2100 },
                (_, i) =>
                    `"1","0","Card ${i}","Modern Horizons 3","${i}","Near Mint","English","","","","","","","","0"`
            ).join('\n');
            const result = DeckboxCsvParser.parse(toBuffer(`${DECKBOX_HEADER}\n${rows}\n`));
            expect(result.length).toBe(2100);
        });
    });
});
