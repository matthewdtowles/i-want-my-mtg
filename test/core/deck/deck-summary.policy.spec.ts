import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Price } from 'src/core/card/price.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckSummaryPolicy } from 'src/core/deck/deck-summary.policy';

function card(id: string, normal: number | null, foil: number | null): Card {
    return new Card({
        id,
        imgSrc: 'x',
        legalities: [],
        name: id,
        number: '1',
        rarity: CardRarity.Common,
        setCode: 'tst',
        sortNumber: '1',
        type: 'Creature',
        prices: [new Price({ cardId: id, normal, foil, date: new Date() })],
    });
}

function deckCard(c: Card | undefined, quantity: number, isSideboard = false): DeckCard {
    return new DeckCard({ cardId: c?.id ?? 'x', quantity, isSideboard, card: c });
}

describe('DeckSummaryPolicy', () => {
    describe('cardValue', () => {
        it('uses the normal price', () => {
            expect(DeckSummaryPolicy.cardValue(card('a', 5, 9))).toBe(5);
        });
        it('falls back to foil when there is no normal price', () => {
            expect(DeckSummaryPolicy.cardValue(card('a', null, 9))).toBe(9);
        });
        it('is 0 when there is no card', () => {
            expect(DeckSummaryPolicy.cardValue(undefined)).toBe(0);
        });
    });

    describe('estimatedValue', () => {
        it('sums quantity * value across all cards (main + side)', () => {
            const cards = [deckCard(card('a', 5, 9), 2), deckCard(card('b', null, 3), 1, true)];
            expect(DeckSummaryPolicy.estimatedValue(cards)).toBe(13);
        });
        it('is 0 for an empty deck', () => {
            expect(DeckSummaryPolicy.estimatedValue([])).toBe(0);
        });
    });

    describe('cardCount', () => {
        const cards = [deckCard(card('a', 1, 1), 3), deckCard(card('b', 1, 1), 2, true)];
        it('counts all boards by default', () => {
            expect(DeckSummaryPolicy.cardCount(cards)).toBe(5);
        });
        it('counts maindeck only', () => {
            expect(DeckSummaryPolicy.cardCount(cards, 'main')).toBe(3);
        });
        it('counts sideboard only', () => {
            expect(DeckSummaryPolicy.cardCount(cards, 'side')).toBe(2);
        });
    });
});
