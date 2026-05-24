import { TcgplayerCsvParser } from 'src/core/import/parsers/tcgplayer-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const APP_HEADER =
    'Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU,Price Each';
const SELLER_HEADER =
    'TCGplayer Id,Product Line,Set Name,Product Name,Title,Number,Rarity,Condition,TCG Market Price,Total Quantity,TCG Marketplace Price,Photo URL';

describe('TcgplayerCsvParser', () => {
    describe('matchesFormat', () => {
        it('recognizes the app export header', () => {
            expect(TcgplayerCsvParser.matchesFormat(APP_HEADER.split(','))).toBe(true);
        });

        it('recognizes the seller export header', () => {
            expect(TcgplayerCsvParser.matchesFormat(SELLER_HEADER.split(','))).toBe(true);
        });

        it('rejects the native IWMM header row', () => {
            expect(
                TcgplayerCsvParser.matchesFormat([
                    'id',
                    'name',
                    'set_code',
                    'number',
                    'quantity',
                    'foil',
                ])
            ).toBe(false);
        });

        it('rejects an Archidekt header row', () => {
            expect(
                TcgplayerCsvParser.matchesFormat([
                    'Quantity',
                    'Name',
                    'Edition Code',
                    'Finish',
                    'Collector Number',
                ])
            ).toBe(false);
        });
    });

    describe('parse (app format)', () => {
        it('returns empty for header-only file', () => {
            expect(TcgplayerCsvParser.parse(toBuffer(APP_HEADER + '\n'))).toEqual([]);
        });

        it('maps app columns onto the import row shape', () => {
            const row =
                '4,Lightning Bolt,Lightning Bolt,Modern Horizons 3,123,MH3,Normal,Near Mint,English,Rare,99999,SKU99,1.50';
            const [parsed] = TcgplayerCsvParser.parse(toBuffer(`${APP_HEADER}\n${row}\n`));
            expect(parsed).toEqual({
                name: 'Lightning Bolt',
                set_code: 'mh3',
                number: '123',
                quantity: '4',
                foil: 'false',
            });
        });

        it('maps Foil printing to foil=true', () => {
            const row =
                '1,Brainstorm,Brainstorm,Eternal Masters,40,EMA,Foil,Near Mint,English,Uncommon,1,SKU1,0.50';
            const [parsed] = TcgplayerCsvParser.parse(toBuffer(`${APP_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('lowercases the set code', () => {
            const row =
                '2,Counterspell,Counterspell,Modern Horizons 2,267,MH2,Normal,Near Mint,English,Rare,2,SKU2,0';
            const [parsed] = TcgplayerCsvParser.parse(toBuffer(`${APP_HEADER}\n${row}\n`));
            expect(parsed.set_code).toBe('mh2');
        });

        it('does not cap rows; service applies MAX_IMPORT_ROWS', () => {
            const rows = Array.from(
                { length: 2100 },
                (_, i) =>
                    `1,Card ${i},Card ${i},Modern Horizons 3,${i},MH3,Normal,NM,en,Rare,${i},SKU${i},0`
            ).join('\n');
            const result = TcgplayerCsvParser.parse(toBuffer(`${APP_HEADER}\n${rows}\n`));
            expect(result.length).toBe(2100);
        });
    });

    describe('parse (seller format)', () => {
        it('maps seller columns and uses set_name', () => {
            const row =
                '12345,Magic,Modern Horizons 3,Lightning Bolt,,123,Rare,Near Mint,1.20,3,1.50,';
            const [parsed] = TcgplayerCsvParser.parse(toBuffer(`${SELLER_HEADER}\n${row}\n`));
            expect(parsed).toEqual({
                name: 'Lightning Bolt',
                set_name: 'Modern Horizons 3',
                number: '123',
                quantity: '3',
                foil: undefined,
            });
        });

        it('filters out non-Magic product lines', () => {
            const rows = [
                '1,Pokemon,Base Set,Charizard,,4,Rare,NM,200,1,300,',
                '2,Magic,Modern Horizons 3,Lightning Bolt,,123,Rare,NM,1,4,1.5,',
            ].join('\n');
            const result = TcgplayerCsvParser.parse(toBuffer(`${SELLER_HEADER}\n${rows}\n`));
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Lightning Bolt');
        });

        it('accepts "Magic: The Gathering" as Product Line', () => {
            const row =
                '1,Magic: The Gathering,Modern Horizons 3,Lightning Bolt,,123,Rare,NM,1,4,1.5,';
            const result = TcgplayerCsvParser.parse(toBuffer(`${SELLER_HEADER}\n${row}\n`));
            expect(result).toHaveLength(1);
        });
    });
});
