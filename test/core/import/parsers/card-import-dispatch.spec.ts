import { parseCardImport } from 'src/core/import/parsers/card-import-dispatch';

function toBuffer(content: string): Buffer {
    return Buffer.from(content, 'utf-8');
}

const ARCHIDEKT_HEADER =
    'Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number';
const MOXFIELD_HEADER =
    '"Count","Tradelist Count","Name","Edition","Condition","Language","Foil","Tags","Last Modified","Collector Number","Alter","Proxy","Purchase Price"';
const DECKBOX_HEADER =
    '"Count","Tradelist Count","Name","Edition","Card Number","Condition","Language","Foil","Signed","Artist Proof","Altered Art","Misprint","Promo","Textless","My Price"';
const TCG_APP_HEADER =
    'Quantity,Name,Simple Name,Set,Card Number,Set Code,Printing,Condition,Language,Rarity,Product ID,SKU,Price Each';
const TCG_SELLER_HEADER =
    'TCGplayer Id,Product Line,Set Name,Product Name,Title,Number,Rarity,Condition,TCG Market Price,Total Quantity,TCG Marketplace Price,Photo URL';

describe('parseCardImport', () => {
    it('routes a native IWMM CSV to the generic parser', () => {
        const csv = 'id,name,set_code,number,quantity,foil\n,Teferi,dmu,1,2,false\n';
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('native');
        expect(rows[0]).toMatchObject({
            name: 'Teferi',
            set_code: 'dmu',
            number: '1',
            quantity: '2',
        });
    });

    it('routes an Archidekt export to the Archidekt parser', () => {
        const csv = `${ARCHIDEKT_HEADER}\n4,Lightning Bolt,Foil,NM,,,,,,MH3,,scry-id,,123\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('archidekt');
        expect(rows[0]).toEqual({
            id: 'scry-id',
            name: 'Lightning Bolt',
            set_code: 'mh3',
            number: '123',
            quantity: '4',
            foil: 'true',
        });
    });

    it('routes a Moxfield export to the Moxfield parser', () => {
        const csv = `${MOXFIELD_HEADER}\n"3","0","Lightning Bolt","MH3","NM","en","foil","","2026-01-01","123","False","False","0"\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('moxfield');
        expect(rows[0]).toEqual({
            name: 'Lightning Bolt',
            set_code: 'mh3',
            number: '123',
            quantity: '3',
            foil: 'true',
        });
    });

    it('routes a Deckbox export to the Deckbox parser (set_name not set_code)', () => {
        const csv = `${DECKBOX_HEADER}\n"1","0","Lightning Bolt","Limited Edition Beta","162","NM","English","","","","","","","","0"\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('deckbox');
        expect(rows[0]).toEqual({
            name: 'Lightning Bolt',
            set_name: 'Limited Edition Beta',
            number: '162',
            quantity: '1',
            foil: 'false',
        });
    });

    it('routes a TCGPlayer app export to the TCGPlayer parser', () => {
        const csv = `${TCG_APP_HEADER}\n2,Lightning Bolt,Lightning Bolt,Modern Horizons 3,123,MH3,Normal,NM,en,Rare,1,SKU,0\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('tcgplayer');
        expect(rows[0]).toEqual({
            name: 'Lightning Bolt',
            set_code: 'mh3',
            number: '123',
            quantity: '2',
            foil: 'false',
        });
    });

    it('routes a TCGPlayer seller export to the TCGPlayer parser (set_name)', () => {
        const csv = `${TCG_SELLER_HEADER}\n1,Magic,Modern Horizons 3,Lightning Bolt,,123,Rare,NM,1,5,1.5,\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('tcgplayer');
        expect(rows[0]).toMatchObject({
            name: 'Lightning Bolt',
            set_name: 'Modern Horizons 3',
            number: '123',
            quantity: '5',
        });
    });

    it('returns empty native result for an empty file', () => {
        expect(parseCardImport(toBuffer(''))).toEqual({ format: 'native', rows: [] });
    });

    it('strips UTF-8 BOM from header detection (Moxfield exports include BOM)', () => {
        const csv = `﻿${MOXFIELD_HEADER}\n"1","0","Lightning Bolt","MH3","NM","en","","","2026-01-01","123","False","False","0"\n`;
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('moxfield');
        expect(rows[0]).toMatchObject({ name: 'Lightning Bolt', set_code: 'mh3' });
    });

    it('handles CRLF line endings', () => {
        const csv =
            'id,name,set_code,number,quantity,foil\r\n,Teferi,dmu,1,2,false\r\n,Counterspell,dmu,2,1,true\r\n';
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('native');
        expect(rows).toHaveLength(2);
    });

    it('handles embedded commas in quoted card names', () => {
        const csv =
            'id,name,set_code,number,quantity,foil\n,"Yawgmoth, Thran Physician",mh2,1,4,false\n';
        const { format, rows } = parseCardImport(toBuffer(csv));
        expect(format).toBe('native');
        expect(rows[0].name).toBe('Yawgmoth, Thran Physician');
    });
});
