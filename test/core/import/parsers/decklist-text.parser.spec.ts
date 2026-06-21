import { parseDecklistText } from 'src/core/import/parsers/decklist-text.parser';

describe('parseDecklistText', () => {
    it('parses plain "4 Name" and "4x Name" counts', () => {
        const { rows, errors } = parseDecklistText('4 Lightning Bolt\n2x Counterspell');
        expect(errors).toEqual([]);
        expect(rows).toEqual([
            { quantity: 4, name: 'Lightning Bolt', setCode: undefined, number: undefined, isSideboard: false, line: 1 },
            { quantity: 2, name: 'Counterspell', setCode: undefined, number: undefined, isSideboard: false, line: 2 },
        ]);
    });

    it('extracts a (SET) code and optional collector number', () => {
        const { rows } = parseDecklistText('1 Sol Ring (CMR)\n1 Sol Ring (CMR) 263\n4 Lightning Bolt [2X2]');
        expect(rows[0]).toMatchObject({ name: 'Sol Ring', setCode: 'cmr', number: undefined });
        expect(rows[1]).toMatchObject({ name: 'Sol Ring', setCode: 'cmr', number: '263' });
        expect(rows[2]).toMatchObject({ name: 'Lightning Bolt', setCode: '2x2' });
    });

    it('routes lines after a Sideboard header to the sideboard', () => {
        const { rows } = parseDecklistText('4 Lightning Bolt\n\nSideboard\n2 Pyroblast');
        expect(rows[0]).toMatchObject({ name: 'Lightning Bolt', isSideboard: false });
        expect(rows[1]).toMatchObject({ name: 'Pyroblast', isSideboard: true });
    });

    it('honors a per-line SB: prefix', () => {
        const { rows } = parseDecklistText('SB: 2 Pyroblast');
        expect(rows[0]).toMatchObject({ name: 'Pyroblast', isSideboard: true, quantity: 2 });
    });

    it('skips blank lines and non-quantity section headers without error', () => {
        const { rows, errors } = parseDecklistText('Commander\n1 Atraxa, Praetors’ Voice\n\nDeck\n1 Sol Ring\nCreatures (1)');
        expect(errors).toEqual([]);
        expect(rows.map((r) => r.name)).toEqual(['Atraxa, Praetors’ Voice', 'Sol Ring']);
    });

    it('strips MTGO foil markers', () => {
        const { rows } = parseDecklistText('4 Lightning Bolt (2X2) 117 *F*');
        expect(rows[0]).toMatchObject({ name: 'Lightning Bolt', setCode: '2x2', number: '117' });
    });

    it('flags a digit-led line it cannot parse', () => {
        const { rows, errors } = parseDecklistText('4\n3 Real Card');
        expect(rows).toHaveLength(1);
        expect(errors).toHaveLength(1);
        expect(errors[0].row).toBe(1);
    });

    it('ignores a zero quantity', () => {
        const { rows } = parseDecklistText('0 Lightning Bolt');
        expect(rows).toEqual([]);
    });
});
