import { Format } from 'src/core/card/format.enum';
import { Deck } from 'src/core/deck/deck.entity';

describe('Deck entity', () => {
    it('constructs with required fields', () => {
        const deck = new Deck({ userId: 1, name: 'My Deck' });
        expect(deck.userId).toBe(1);
        expect(deck.name).toBe('My Deck');
        expect(deck.format).toBeNull();
        expect(deck.description).toBeNull();
    });

    it('accepts a format', () => {
        const deck = new Deck({ userId: 1, name: 'Modern Burn', format: Format.Modern });
        expect(deck.format).toBe(Format.Modern);
    });

    it('throws when userId is missing', () => {
        expect(() => new Deck({ name: 'No User' })).toThrow(/userId is required/);
    });

    it('throws when name is missing', () => {
        expect(() => new Deck({ userId: 1 })).toThrow(/name is required/);
    });

    it('throws when name is blank', () => {
        expect(() => new Deck({ userId: 1, name: '   ' })).toThrow(/name/i);
    });

    it('throws when format is not a valid Format value', () => {
        expect(
            () => new Deck({ userId: 1, name: 'X', format: 'pauper-foo' as Format })
        ).toThrow(/format/i);
    });

    it('preserves id, timestamps, and cards if supplied', () => {
        const created = new Date('2026-01-01');
        const updated = new Date('2026-02-01');
        const deck = new Deck({
            id: 7,
            userId: 1,
            name: 'X',
            description: 'a deck',
            createdAt: created,
            updatedAt: updated,
            cards: [],
        });
        expect(deck.id).toBe(7);
        expect(deck.description).toBe('a deck');
        expect(deck.createdAt).toBe(created);
        expect(deck.updatedAt).toBe(updated);
        expect(deck.cards).toEqual([]);
    });
});
