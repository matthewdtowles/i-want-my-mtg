import { AffiliateLinkPolicy } from 'src/core/affiliate/affiliate-link.policy';
import { Card } from 'src/core/card/card.entity';
import { CardApiResponseDto } from './dto/card-response.dto';

export class CardApiPresenter {
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
}
