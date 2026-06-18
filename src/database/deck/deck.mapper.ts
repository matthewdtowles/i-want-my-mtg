import { DeckCard } from 'src/core/deck/deck-card.entity';
import { Deck } from 'src/core/deck/deck.entity';
import { CardMapper } from 'src/database/card/card.mapper';
import { DeckCardOrmEntity } from './deck-card.orm-entity';
import { DeckOrmEntity } from './deck.orm-entity';

export class DeckMapper {
    static toCore(orm: DeckOrmEntity): Deck {
        return new Deck({
            id: orm.id,
            userId: orm.userId,
            name: orm.name,
            format: orm.format ?? null,
            createdAt: orm.createdAt,
            updatedAt: orm.updatedAt,
            cards: orm.cards ? orm.cards.map((c) => DeckMapper.cardToCore(c)) : undefined,
        });
    }

    static cardToCore(orm: DeckCardOrmEntity): DeckCard {
        return new DeckCard({
            deckId: orm.deckId,
            cardId: orm.cardId,
            quantity: orm.quantity,
            isSideboard: orm.isSideboard,
            card: orm.card ? CardMapper.toCore(orm.card) : undefined,
        });
    }

    static toOrmEntity(deck: Deck): DeckOrmEntity {
        const orm = new DeckOrmEntity();
        if (deck.id !== undefined) {
            orm.id = deck.id;
        }
        orm.userId = deck.userId;
        orm.name = deck.name;
        orm.format = deck.format ?? null;
        return orm;
    }
}
