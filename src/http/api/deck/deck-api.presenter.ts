import { Deck } from 'src/core/deck/deck.entity';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckSummary } from 'src/core/deck/ports/deck.repository.port';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { DeckApiDto, DeckCardApiDto } from './dto/deck-response.dto';

export class DeckApiPresenter {
    static toSummaryDto(summary: DeckSummary): DeckApiDto {
        const { deck, cardCount, sideboardCount } = summary;
        return {
            id: deck.id,
            name: deck.name,
            format: deck.format,
            description: deck.description,
            cardCount,
            sideboardCount,
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
        };
    }

    static toDetailDto(deck: Deck): DeckApiDto {
        const cards = deck.cards ?? [];
        const main = cards
            .filter((c) => !c.isSideboard)
            .reduce((sum, c) => sum + c.quantity, 0);
        const side = cards
            .filter((c) => c.isSideboard)
            .reduce((sum, c) => sum + c.quantity, 0);
        return {
            id: deck.id,
            name: deck.name,
            format: deck.format,
            description: deck.description,
            cardCount: main,
            sideboardCount: side,
            createdAt: deck.createdAt,
            updatedAt: deck.updatedAt,
            cards: cards.map(DeckApiPresenter.toCardDto),
        };
    }

    static toCardDto(dc: DeckCard): DeckCardApiDto {
        const card = dc.card;
        const latestPrice = card?.prices?.[0];
        const price = latestPrice
            ? PriceCalculationPolicy.calculateCardValue(
                  latestPrice.normal ?? null,
                  latestPrice.foil ?? null,
                  false
              )
            : null;
        return {
            cardId: dc.cardId,
            quantity: dc.quantity,
            isSideboard: dc.isSideboard,
            cardName: card?.name,
            cardNumber: card?.number,
            setCode: card?.setCode,
            imgSrc: card?.imgSrc,
            type: card?.type,
            manaCost: card?.manaCost,
            price: price,
        };
    }
}
