import { AffiliateLinkPolicy } from 'src/core/affiliate/affiliate-link.policy';
import { Card } from 'src/core/card/card.entity';
import { Format } from 'src/core/card/format.enum';
import { GranularPrice } from 'src/core/card/granular-price.entity';
import { DeckLegalityPolicy } from 'src/core/deck/deck-legality.policy';
import { groupBuylistByFinish } from 'src/core/pricing/buylist.policy';
import { vendorDisplayName } from 'src/core/pricing/vendor';
import { CardBuylistApiResponseDto } from './dto/card-buylist-response.dto';
import { CardApiResponseDto } from './dto/card-response.dto';

export class CardApiPresenter {
    /** Structured buylist offers for a card — same grouping the card page uses, raw numbers. */
    static toBuylist(cardId: string, offers: GranularPrice[]): CardBuylistApiResponseDto {
        const finishes = groupBuylistByFinish(offers).map((group) => {
            const mapped = group.offers.map((o) => ({
                provider: o.provider,
                vendor: vendorDisplayName(o.provider),
                price: o.price,
                isBest: o.isBest,
            }));
            return { finish: group.finish, best: mapped[0], offers: mapped };
        });
        return { cardId, finishes, hasAny: finishes.length > 0 };
    }

    static toCardApiResponse(card: Card): CardApiResponseDto {
        const latestPrice = card.prices?.[0];
        return {
            id: card.id,
            name: card.name,
            setCode: card.setCode,
            number: card.number,
            type: card.type,
            rarity: card.rarity,
            manaCost: card.manaCost,
            oracleText: card.oracleText,
            artist: card.artist,
            flavorName: card.flavorName,
            imgSrc: card.imgSrc,
            hasFoil: card.hasFoil,
            hasNonFoil: card.hasNonFoil,
            prices: latestPrice
                ? {
                      normal: latestPrice.normal != null ? Number(latestPrice.normal) : null,
                      foil: latestPrice.foil != null ? Number(latestPrice.foil) : null,
                      normalChangeWeekly:
                          latestPrice.normalChangeWeekly != null
                              ? Number(latestPrice.normalChangeWeekly)
                              : null,
                      foilChangeWeekly:
                          latestPrice.foilChangeWeekly != null
                              ? Number(latestPrice.foilChangeWeekly)
                              : null,
                  }
                : undefined,
            setName: card.set?.name,
            keyruneCode: card.set?.keyruneCode ?? card.setCode,
            purchaseUrlTcgplayer: AffiliateLinkPolicy.buildTcgplayerLink(card.tcgplayerProductId),
            purchaseUrlTcgplayerEtched: AffiliateLinkPolicy.buildTcgplayerLink(
                card.tcgplayerEtchedProductId
            ),
        };
    }

    /**
     * Representative-printing response for the grouped (one-per-name) search.
     * Adds the deck-legality flag for the requested format so the in-page deck
     * search can render the "Not legal" badge on cards it inserts. Without a
     * format the flag is omitted (legality is meaningless with no target format).
     */
    static toGroupedCardApiResponse(card: Card, format?: Format): CardApiResponseDto {
        const base = this.toCardApiResponse(card);
        if (!format) {
            return base;
        }
        return { ...base, legal: DeckLegalityPolicy.isCardLegal(format, card.legalities) };
    }
}
