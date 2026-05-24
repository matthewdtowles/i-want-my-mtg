import { ArchidektCsvParser } from 'src/core/import/parsers/archidekt-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const ARCHIDEKT_HEADER =
    'Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number';

describe('ArchidektCsvParser', () => {
    describe('matchesFormat', () => {
        it('recognizes an Archidekt header row', () => {
            expect(ArchidektCsvParser.matchesFormat(ARCHIDEKT_HEADER.split(','))).toBe(true);
        });

        it('is case-insensitive and tolerates whitespace', () => {
            expect(ArchidektCsvParser.matchesFormat([' Finish ', 'EDITION CODE', 'Name'])).toBe(
                true
            );
        });

        it('rejects the native IWMM header row', () => {
            expect(
                ArchidektCsvParser.matchesFormat([
                    'id',
                    'name',
                    'set_code',
                    'number',
                    'quantity',
                    'foil',
                ])
            ).toBe(false);
        });
    });

    describe('parse', () => {
        it('returns empty array for header-only file', () => {
            expect(ArchidektCsvParser.parse(toBuffer(ARCHIDEKT_HEADER + '\n'))).toEqual([]);
        });

        it('maps Archidekt columns onto the import row shape', () => {
            const row =
                '4,Lightning Bolt,Normal,NM,2026-01-01,EN,1.50,,Modern Horizons 3,MH3,12345,abc-scry-id,67890,123';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed).toEqual({
                id: 'abc-scry-id',
                name: 'Lightning Bolt',
                set_code: 'mh3',
                number: '123',
                quantity: '4',
                foil: 'false',
            });
        });

        it('maps Foil finish to foil=true', () => {
            const row = '1,Brainstorm,Foil,NM,,,,,,EMA,,scry-1,,40';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('maps Etched finish to foil=true', () => {
            const row = '1,Command Tower,Etched,NM,,,,,,CMM,,scry-2,,50';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed.foil).toBe('true');
        });

        it('lowercases the edition code', () => {
            const row = '2,Counterspell,Normal,NM,,,,,,MH2,,scry-3,,267';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed.set_code).toBe('mh2');
        });

        it('treats blank quantity as undefined', () => {
            const row = ',Ponder,Normal,NM,,,,,,M10,,scry-4,,79';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed.quantity).toBeUndefined();
        });

        it('does not cap rows; service applies MAX_IMPORT_ROWS', () => {
            const rows = Array.from(
                { length: 2100 },
                (_, i) => `1,Card ${i},Normal,NM,,,,,,MH3,,scry-${i},,${i}`
            ).join('\n');
            const result = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${rows}\n`));
            expect(result.length).toBe(2100);
        });

        it('ignores extra Archidekt columns without error', () => {
            const row =
                '1,Sol Ring,Normal,LP,2026-02-02,JP,99.99,edh;ramp,Commander Masters,CMM,99,scry-5,11,1';
            const [parsed] = ArchidektCsvParser.parse(toBuffer(`${ARCHIDEKT_HEADER}\n${row}\n`));
            expect(parsed.name).toBe('Sol Ring');
            expect(parsed.set_code).toBe('cmm');
        });
    });
});
