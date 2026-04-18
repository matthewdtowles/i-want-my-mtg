import { Deck } from 'src/core/deck/deck.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { Format } from 'src/core/card/format.enum';
import { CardMapper } from 'src/database/card/card.mapper';
import { DeckOrmEntity } from './deck.orm-entity';
import { DeckCardOrmEntity } from './deck-card.orm-entity';

export class DeckMapper {
    static toCore(orm: DeckOrmEntity, cards?: DeckCard[]): Deck {
        return new Deck({
            id: orm.id,
            userId: orm.userId,
            name: orm.name,
            format: (orm.format as Format) ?? null,
            description: orm.description,
            createdAt: orm.createdAt,
            updatedAt: orm.updatedAt,
            cards,
        });
    }

    static toOrm(deck: Deck): DeckOrmEntity {
        const orm = new DeckOrmEntity();
        if (deck.id != null) orm.id = deck.id;
        orm.userId = deck.userId;
        orm.name = deck.name;
        orm.format = deck.format;
        orm.description = deck.description;
        return orm;
    }
}

export class DeckCardMapper {
    static toCore(orm: DeckCardOrmEntity): DeckCard {
        return new DeckCard({
            deckId: orm.deckId,
            cardId: orm.cardId,
            isSideboard: orm.isSideboard,
            quantity: orm.quantity,
            card: orm.card ? CardMapper.toCore(orm.card) : undefined,
        });
    }

    static toOrm(dc: DeckCard): DeckCardOrmEntity {
        const orm = new DeckCardOrmEntity();
        orm.deckId = dc.deckId;
        orm.cardId = dc.cardId;
        orm.isSideboard = dc.isSideboard;
        orm.quantity = dc.quantity;
        return orm;
    }
}
