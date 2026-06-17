import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { Format } from 'src/core/card/format.enum';
import { Legality } from 'src/core/card/legality.entity';
import { LegalityStatus } from 'src/core/card/legality.status.enum';
import { Price } from 'src/core/card/price.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { Deck } from 'src/core/deck/deck.entity';
import { DeckApiPresenter } from 'src/http/api/deck/deck-api.presenter';

function card(id: string, type: string, normal: number, legalities: Legality[] = []): Card {
    return new Card({
        id,
        imgSrc: 'a/b/c.jpg',
        legalities,
        name: id,
        number: '1',
        rarity: CardRarity.Common,
        setCode: 'tst',
        sortNumber: '1',
        type,
        prices: [new Price({ cardId: id, normal, foil: null, date: new Date() })],
    });
}

describe('DeckApiPresenter.toDetail', () => {
    it('maps cards, totals value, and flags legality for the deck format', () => {
        const legal = card('a', 'Creature', 5, [
            new Legality({ cardId: 'a', format: Format.Modern, status: LegalityStatus.Legal }),
        ]);
        const banned = card('b', 'Instant', 3, [
            new Legality({ cardId: 'b', format: Format.Modern, status: LegalityStatus.Banned }),
        ]);
        const deck = new Deck({
            id: 1,
            userId: 7,
            name: 'd',
            format: Format.Modern,
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: [
                new DeckCard({ cardId: 'a', quantity: 2, isSideboard: false, card: legal }),
                new DeckCard({ cardId: 'b', quantity: 1, isSideboard: false, card: banned }),
            ],
        });

        const dto = DeckApiPresenter.toDetail(deck);

        expect(dto.id).toBe(1);
        expect(dto.cardCount).toBe(3);
        expect(dto.estimatedValue).toBe(13);
        expect(dto.illegalCount).toBe(1);
        expect(dto.cards.find((c) => c.cardId === 'a')?.legalInFormat).toBe(true);
        expect(dto.cards.find((c) => c.cardId === 'b')?.legalInFormat).toBe(false);
    });

    it('leaves legalInFormat null and illegalCount 0 when the deck has no format', () => {
        const deck = new Deck({
            id: 1,
            userId: 7,
            name: 'd',
            format: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: [new DeckCard({ cardId: 'a', quantity: 1, isSideboard: false, card: card('a', 'Creature', 5) })],
        });

        const dto = DeckApiPresenter.toDetail(deck);

        expect(dto.cards[0].legalInFormat).toBeNull();
        expect(dto.illegalCount).toBe(0);
    });
});
