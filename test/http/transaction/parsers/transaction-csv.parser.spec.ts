import { TransactionCsvParser } from 'src/http/hbs/transaction/parsers/transaction-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const ALL_HEADERS =
    'id,name,set_code,number,type,quantity,price_per_unit,foil,date,source,fees,notes';

function csvRow(fields: Record<string, string> = {}): string {
    const defaults = {
        id: 'abc-123',
        name: '',
        set_code: '',
        number: '',
        type: 'BUY',
        quantity: '4',
        price_per_unit: '2.50',
        foil: '',
        date: '2025-01-15',
        source: '',
        fees: '',
        notes: '',
    };
    const merged = { ...defaults, ...fields };
    return [
        merged.id,
        merged.name,
        merged.set_code,
        merged.number,
        merged.type,
        merged.quantity,
        merged.price_per_unit,
        merged.foil,
        merged.date,
        merged.source,
        merged.fees,
        merged.notes,
    ].join(',');
}

describe('TransactionCsvParser', () => {
    describe('parse', () => {
        it('returns empty array for empty file', () => {
            expect(TransactionCsvParser.parse(toBuffer(''))).toEqual([]);
        });

        it('returns empty array for headers only', () => {
            expect(TransactionCsvParser.parse(toBuffer(ALL_HEADERS + '\n'))).toEqual([]);
        });

        it('parses a complete row with all fields', () => {
            const csv = ALL_HEADERS + '\n' + csvRow({
                id: 'uuid-1',
                name: 'Teferi',
                set_code: 'dmu',
                number: '1',
                type: 'BUY',
                quantity: '4',
                price_per_unit: '2.50',
                foil: 'true',
                date: '2025-01-15',
                source: 'TCGPlayer',
                fees: '0.50',
                notes: 'Good deal',
            }) + '\n';

            const [row] = TransactionCsvParser.parse(toBuffer(csv));

            expect(row).toMatchObject({
                id: 'uuid-1',
                name: 'Teferi',
                set_code: 'dmu',
                number: '1',
                type: 'BUY',
                quantity: '4',
                price_per_unit: '2.50',
                foil: 'true',
                date: '2025-01-15',
                source: 'TCGPlayer',
                fees: '0.50',
                notes: 'Good deal',
            });
        });

        it('treats empty optional fields as undefined', () => {
            const csv = ALL_HEADERS + '\n' + csvRow({
                source: '',
                fees: '',
                notes: '',
                foil: '',
            }) + '\n';

            const [row] = TransactionCsvParser.parse(toBuffer(csv));

            expect(row.source).toBeUndefined();
            expect(row.fees).toBeUndefined();
            expect(row.notes).toBeUndefined();
            expect(row.foil).toBeUndefined();
        });

        it('trims whitespace from all values', () => {
            const csv = ALL_HEADERS + '\n' +
                '  uuid-1  , Card Name , dmu , 1 , BUY , 4 , 2.50 , true , 2025-01-15 , TCG , 0.5 , note \n';

            const [row] = TransactionCsvParser.parse(toBuffer(csv));

            expect(row.id).toBe('uuid-1');
            expect(row.name).toBe('Card Name');
            expect(row.type).toBe('BUY');
            expect(row.source).toBe('TCG');
        });

        it('returns all rows beyond 2000 (truncation is handled by the service)', () => {
            const header = ALL_HEADERS + '\n';
            const rows = Array.from(
                { length: 2100 },
                (_, i) => csvRow({ id: `id${i}` })
            ).join('\n');

            const result = TransactionCsvParser.parse(toBuffer(header + rows));
            expect(result.length).toBe(2100);
        });

        it('throws for unknown column', () => {
            const csv = 'id,type,unknown_col\nabc,BUY,xyz\n';
            expect(() => TransactionCsvParser.parse(toBuffer(csv))).toThrow(/Unknown column/);
        });

        it('works with subset of columns', () => {
            const csv = 'set_code,number,type,quantity,price_per_unit,date\n' +
                'dmu,1,BUY,4,2.50,2025-01-15\n';

            const [row] = TransactionCsvParser.parse(toBuffer(csv));

            expect(row.set_code).toBe('dmu');
            expect(row.number).toBe('1');
            expect(row.type).toBe('BUY');
            expect(row.id).toBeUndefined();
        });

        it('preserves type casing as-is', () => {
            const csv = ALL_HEADERS + '\n' + csvRow({ type: 'buy' }) + '\n';
            const [row] = TransactionCsvParser.parse(toBuffer(csv));
            expect(row.type).toBe('buy');
        });
    });
});
