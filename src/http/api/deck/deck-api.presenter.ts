import { Format } from 'src/core/card/format.enum';
import { DeckCard } from 'src/core/deck/deck-card.entity';
import { DeckLegalityPolicy } from 'src/core/deck/deck-legality.policy';
import { DeckSummaryPolicy } from 'src/core/deck/deck-summary.policy';
import { Deck } from 'src/core/deck/deck.entity';
import { BASE_IMAGE_URL, buildCardUrl } from 'src/http/base/http.util';
import { DeckCardApiDto, DeckDetailApiDto, DeckSummaryApiDto } from './dto/deck-response.dto';

export class DeckApiPresenter {
    static toSummary(deck: Deck): DeckSummaryApiDto {
        const cards = deck.cards ?? [];
        return {
            id: deck.id!,
            name: deck.name,
            format: deck.format ?? null,
            cardCount: DeckSummaryPolicy.cardCount(cards),
            estimatedValue: round2(DeckSummaryPolicy.estimatedValue(cards)),
            createdAt: deck.createdAt?.toISOString() ?? '',
            updatedAt: deck.updatedAt?.toISOString() ?? '',
        };
    }

    static toDetail(deck: Deck): DeckDetailApiDto {
        const cards = deck.cards ?? [];
        const cardDtos = cards.map((c) => DeckApiPresenter.toCard(c, deck.format ?? null));
        return {
            ...DeckApiPresenter.toSummary(deck),
            illegalCount: cardDtos.filter((c) => c.legalInFormat === false).length,
            cards: cardDtos,
        };
    }

    static toCard(deckCard: DeckCard, format: Format | null): DeckCardApiDto {
        const card = deckCard.card;
        if (!card) {
            return {
                cardId: deckCard.cardId,
                quantity: deckCard.quantity,
                isSideboard: deckCard.isSideboard,
            };
        }
        const price = card.prices?.[0];
        return {
            cardId: deckCard.cardId,
            quantity: deckCard.quantity,
            isSideboard: deckCard.isSideboard,
            cardName: card.name,
            setCode: card.setCode,
            cardNumber: card.number,
            imgSrc: `${BASE_IMAGE_URL}/normal/front/${card.imgSrc}`,
            rarity: card.rarity?.toLowerCase(),
            type: card.type,
            manaCost: card.manaCost,
            keyruneCode: card.set?.keyruneCode ?? card.setCode,
            priceNormal: price?.normal != null ? Number(price.normal) : null,
            priceFoil: price?.foil != null ? Number(price.foil) : null,
            legalInFormat: format ? DeckLegalityPolicy.isCardLegal(format, card.legalities) : null,
            url: buildCardUrl(card.setCode, card.number),
        };
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
