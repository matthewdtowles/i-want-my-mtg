import { Format } from 'src/core/card/format.enum';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckApiPresenter } from 'src/http/api/deck/deck-api.presenter';

const mockCard = (overrides: any = {}) => ({
    id: 'c1',
    setCode: 'XYZ',
    name: 'Bolt',
    number: '1',
    sortNumber: '1',
    rarity: 'common',
    imgSrc: 'x.png',
    type: 'Instant',
    manaCost: '{R}',
    legalities: [],
    prices: [{ normal: 1.5, foil: 5.0 }],
    ...overrides,
});

describe('DeckApiPresenter', () => {
    describe('toSummaryDto', () => {
        it('maps deck + counts', () => {
            const deck = new Deck({
                id: 1,
                userId: 10,
                name: 'Burn',
                format: Format.Modern,
            });
            const dto = DeckApiPresenter.toSummaryDto({
                deck,
                cardCount: 60,
                sideboardCount: 15,
            });
            expect(dto.id).toBe(1);
            expect(dto.name).toBe('Burn');
            expect(dto.format).toBe(Format.Modern);
            expect(dto.cardCount).toBe(60);
            expect(dto.sideboardCount).toBe(15);
            expect(dto.cards).toBeUndefined();
        });
    });

    describe('toDetailDto', () => {
        it('computes counts from cards array', () => {
            const cards = [
                new DeckCard({ deckId: 1, cardId: 'c1', quantity: 4, isSideboard: false }),
                new DeckCard({ deckId: 1, cardId: 'c2', quantity: 2, isSideboard: true }),
            ];
            const deck = new Deck({ id: 1, userId: 10, name: 'X', cards });
            const dto = DeckApiPresenter.toDetailDto(deck);
            expect(dto.cardCount).toBe(4);
            expect(dto.sideboardCount).toBe(2);
            expect(dto.cards).toHaveLength(2);
        });

        it('returns empty counts when no cards', () => {
            const deck = new Deck({ id: 1, userId: 10, name: 'X' });
            const dto = DeckApiPresenter.toDetailDto(deck);
            expect(dto.cardCount).toBe(0);
            expect(dto.sideboardCount).toBe(0);
            expect(dto.cards).toEqual([]);
        });
    });

    describe('toCardDto', () => {
        it('maps joined card data and price', () => {
            const dc = new DeckCard({
                deckId: 1,
                cardId: 'c1',
                quantity: 4,
                isSideboard: false,
                card: mockCard() as any,
            });
            const dto = DeckApiPresenter.toCardDto(dc);
            expect(dto.cardId).toBe('c1');
            expect(dto.quantity).toBe(4);
            expect(dto.isSideboard).toBe(false);
            expect(dto.cardName).toBe('Bolt');
            expect(dto.setCode).toBe('XYZ');
            expect(dto.manaCost).toBe('{R}');
            expect(dto.price).toBe(1.5);
        });

        it('handles missing card', () => {
            const dc = new DeckCard({ deckId: 1, cardId: 'c1', quantity: 1 });
            const dto = DeckApiPresenter.toCardDto(dc);
            expect(dto.cardId).toBe('c1');
            expect(dto.cardName).toBeUndefined();
            expect(dto.price).toBeNull();
        });

        it('falls back to foil when normal is missing', () => {
            const dc = new DeckCard({
                deckId: 1,
                cardId: 'c1',
                quantity: 1,
                card: mockCard({ prices: [{ normal: null, foil: 5.0 }] }) as any,
            });
            const dto = DeckApiPresenter.toCardDto(dc);
            expect(dto.price).toBe(5.0);
        });
    });
});
