import { parseCardImport } from 'src/http/hbs/inventory/parsers/card-import-dispatch';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const ARCHIDEKT_HEADER =
    'Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number';

describe('parseCardImport', () => {
    it('routes a native IWMM CSV to the generic parser', () => {
        const csv = 'id,name,set_code,number,quantity,foil\n,Teferi,dmu,1,2,false\n';
        const [row] = parseCardImport(toBuffer(csv));
        expect(row).toMatchObject({ name: 'Teferi', set_code: 'dmu', number: '1', quantity: '2' });
    });

    it('routes an Archidekt export to the Archidekt parser', () => {
        const csv = `${ARCHIDEKT_HEADER}\n4,Lightning Bolt,Foil,NM,,,,,,MH3,,scry-id,,123\n`;
        const [row] = parseCardImport(toBuffer(csv));
        expect(row).toEqual({
            id: 'scry-id',
            name: 'Lightning Bolt',
            set_code: 'mh3',
            number: '123',
            quantity: '4',
            foil: 'true',
        });
    });

    it('returns empty array for an empty file', () => {
        expect(parseCardImport(toBuffer(''))).toEqual([]);
    });
});
