import { DeckCard } from 'src/core/deck/deck-card.entity';
import { PublishedDeck } from 'src/core/published-deck/published-deck.entity';
import { CardMapper } from 'src/database/card/card.mapper';
import { PublishedDeckCardOrmEntity } from './published-deck-card.orm-entity';
import { PublishedDeckOrmEntity } from './published-deck.orm-entity';

export class PublishedDeckMapper {
    static toCore(orm: PublishedDeckOrmEntity): PublishedDeck {
        return new PublishedDeck({
            id: orm.id,
            source: orm.source,
            sourceUri: orm.sourceUri,
            tournamentName: orm.tournamentName,
            // `date` columns come back as YYYY-MM-DD strings; keep them as a Date.
            tournamentDate: orm.tournamentDate ? new Date(orm.tournamentDate) : null,
            format: orm.format,
            archetype: orm.archetype,
            player: orm.player,
            result: orm.result,
            cards: orm.cards ? orm.cards.map((c) => PublishedDeckMapper.cardToCore(c)) : undefined,
        });
    }

    static cardToCore(orm: PublishedDeckCardOrmEntity): DeckCard {
        return new DeckCard({
            cardId: orm.cardId,
            quantity: orm.quantity,
            isSideboard: orm.isSideboard,
            card: orm.card ? CardMapper.toCore(orm.card) : undefined,
        });
    }
}
