import { DeckCard } from 'src/core/deck/deck-card.entity';
import { deckColorPips } from 'src/http/hbs/deck/deck-mana';

function card(manaCost: string | undefined, quantity: number): DeckCard {
    return new DeckCard({
        cardId: manaCost ?? 'land',
        quantity,
        isSideboard: false,
        card: { manaCost } as any,
    });
}

describe('deckColorPips', () => {
    it('returns no pips when nothing has a mana cost', () => {
        expect(deckColorPips([card(undefined, 20)])).toEqual([]);
    });

    it('orders colors by quantity-weighted card count, most abundant first', () => {
        // 12 red cards, 4 white cards -> red before white.
        const pips = deckColorPips([
            card('{R}', 4),
            card('{1}{R}', 4),
            card('{R}{R}', 4),
            card('{W}', 4),
        ]);
        expect(pips.map((p) => p.symbol)).toEqual(['r', 'w']);
    });

    it('never marks a single-color deck small', () => {
        const pips = deckColorPips([card('{W}', 1)]);
        expect(pips).toEqual([{ symbol: 'w', small: false }]);
    });

    it('marks a minor color (< 8% of colored cards) small, but never the most abundant', () => {
        // 30 red, 1 white -> white is ~3% so it renders small; red stays normal.
        const cards = [card('{R}', 30), card('{W}', 1)];
        const pips = deckColorPips(cards);
        expect(pips).toEqual([
            { symbol: 'r', small: false },
            { symbol: 'w', small: true },
        ]);
    });

    it('keeps a color normal when it is above the minor threshold', () => {
        // 10 red, 3 white -> white is ~23%, stays normal.
        const pips = deckColorPips([card('{R}', 10), card('{W}', 3)]);
        expect(pips).toEqual([
            { symbol: 'r', small: false },
            { symbol: 'w', small: false },
        ]);
    });

    it('counts a multicolor card toward each of its colors', () => {
        const pips = deckColorPips([card('{W}{U}', 4)]);
        expect(pips.map((p) => p.symbol).sort()).toEqual(['u', 'w']);
    });

    it('breaks ties by canonical WUBRG order', () => {
        const pips = deckColorPips([card('{G}', 4), card('{W}', 4)]);
        expect(pips.map((p) => p.symbol)).toEqual(['w', 'g']);
    });
});
