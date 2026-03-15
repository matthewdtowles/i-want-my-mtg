import { SetCsvParser } from 'src/http/hbs/inventory/parsers/set-csv.parser';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

describe('SetCsvParser', () => {
    describe('parse', () => {
        it('returns empty array for headers-only file', () => {
            const csv = 'set_code,set_name,foil,include_variants\n';
            expect(SetCsvParser.parse(toBuffer(csv))).toEqual([]);
        });

        it('parses set_code row', () => {
            const csv = 'set_code,set_name,foil,include_variants\ndmu,,,\n';
            const [row] = SetCsvParser.parse(toBuffer(csv));
            expect(row.set_code).toBe('dmu');
            expect(row.set_name).toBeUndefined();
        });

        it('parses set_name row', () => {
            const csv = 'set_code,set_name,foil,include_variants\n,Dominaria United,,\n';
            const [row] = SetCsvParser.parse(toBuffer(csv));
            expect(row.set_name).toBe('Dominaria United');
            expect(row.set_code).toBeUndefined();
        });

        it('parses foil and include_variants', () => {
            const csv = 'set_code,set_name,foil,include_variants\ndmu,,true,true\n';
            const [row] = SetCsvParser.parse(toBuffer(csv));
            expect(row.foil).toBe('true');
            expect(row.include_variants).toBe('true');
        });

        it('parses multiple rows', () => {
            const csv = 'set_code,set_name,foil,include_variants\ndmu,,,\ngrn,,,\n';
            const result = SetCsvParser.parse(toBuffer(csv));
            expect(result.length).toBe(2);
            expect(result[0].set_code).toBe('dmu');
            expect(result[1].set_code).toBe('grn');
        });

        it('caps rows at 2000', () => {
            const header = 'set_code,set_name,foil,include_variants\n';
            const rows = Array.from({ length: 2100 }, (_, i) => `set${i},,,\n`).join('');
            const result = SetCsvParser.parse(toBuffer(header + rows));
            expect(result.length).toBe(2000);
        });

        it('throws for unknown column', () => {
            const csv = 'set_code,bad_col\ndmu,xyz\n';
            expect(() => SetCsvParser.parse(toBuffer(csv))).toThrow(/Unknown column/);
        });
    });
});
