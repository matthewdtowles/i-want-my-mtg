import { DeckCard } from 'src/core/deck/deck-card.entity';

describe('DeckCard entity', () => {
    it('constructs with required fields', () => {
        const dc = new DeckCard({ deckId: 1, cardId: 'abc', quantity: 4 });
        expect(dc.deckId).toBe(1);
        expect(dc.cardId).toBe('abc');
        expect(dc.quantity).toBe(4);
        expect(dc.isSideboard).toBe(false);
    });

    it('accepts isSideboard true', () => {
        const dc = new DeckCard({ deckId: 1, cardId: 'abc', quantity: 2, isSideboard: true });
        expect(dc.isSideboard).toBe(true);
    });

    it('throws when quantity is < 1', () => {
        expect(() => new DeckCard({ deckId: 1, cardId: 'abc', quantity: 0 })).toThrow(
            /quantity/i
        );
    });

    it('throws when quantity is missing', () => {
        expect(() => new DeckCard({ deckId: 1, cardId: 'abc' })).toThrow(/quantity is required/);
    });

    it('throws when deckId is missing', () => {
        expect(() => new DeckCard({ cardId: 'abc', quantity: 1 })).toThrow(/deckId is required/);
    });

    it('throws when cardId is missing', () => {
        expect(() => new DeckCard({ deckId: 1, quantity: 1 })).toThrow(/cardId is required/);
    });
});
