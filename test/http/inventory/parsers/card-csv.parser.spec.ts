import { CardCsvParser } from 'src/http/inventory/parsers/card-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

describe('CardCsvParser', () => {
    describe('parse', () => {
        it('returns empty array for empty file (headers only)', () => {
            const csv = 'id,name,set_code,number,quantity,foil\n';
            expect(CardCsvParser.parse(toBuffer(csv))).toEqual([]);
        });

        it('returns empty array for completely empty file', () => {
            const csv = '';
            expect(CardCsvParser.parse(toBuffer(csv))).toEqual([]);
        });

        it('parses id-only row', () => {
            const csv = 'id,name,set_code,number,quantity,foil\nabc-123,,,,,\n';
            const result = CardCsvParser.parse(toBuffer(csv));
            expect(result[0].id).toBe('abc-123');
        });

        it('parses set_code + number row', () => {
            const csv = 'id,name,set_code,number,quantity,foil\n,Teferi,dmu,1,2,false\n';
            const result = CardCsvParser.parse(toBuffer(csv));
            expect(result[0]).toMatchObject({
                name: 'Teferi',
                set_code: 'dmu',
                number: '1',
                quantity: '2',
                foil: 'false',
            });
        });

        it('parses case-insensitive foil values', () => {
            const headers = 'id,name,set_code,number,quantity,foil\n';
            for (const val of ['TRUE', 'True', '1', 'false', 'False']) {
                const row = `,card,dmu,1,,${val}\n`;
                const [parsed] = CardCsvParser.parse(toBuffer(headers + row));
                expect(parsed.foil).toBe(val);
            }
        });

        it('handles blank quantity (ensure-at-least-one semantics)', () => {
            const csv = 'id,name,set_code,number,quantity,foil\n,card,dmu,1,,\n';
            const [row] = CardCsvParser.parse(toBuffer(csv));
            expect(row.quantity).toBeUndefined();
        });

        it('caps rows at 2000', () => {
            const header = 'id,name,set_code,number,quantity,foil\n';
            const rows = Array.from({ length: 2100 }, (_, i) => `id${i},,,,1,\n`).join('');
            const result = CardCsvParser.parse(toBuffer(header + rows));
            expect(result.length).toBe(2000);
        });

        it('throws for unknown column', () => {
            const csv = 'id,unknown_col\nabc,xyz\n';
            expect(() => CardCsvParser.parse(toBuffer(csv))).toThrow(/Unknown column/);
        });

        it('trims whitespace from values', () => {
            const csv =
                'id,name,set_code,number,quantity,foil\n  abc  , Card Name , dmu , 1 , 2 , true \n';
            const [row] = CardCsvParser.parse(toBuffer(csv));
            expect(row.id).toBe('abc');
            expect(row.name).toBe('Card Name');
            expect(row.set_code).toBe('dmu');
        });
    });
});
