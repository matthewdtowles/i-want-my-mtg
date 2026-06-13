import { BuyListItem } from 'src/core/buy-list/buy-list-item.entity';
import { BASE_IMAGE_URL, buildCardUrl } from 'src/http/base/http.util';
import { BuyListItemApiDto } from './dto/buy-list-response.dto';

export class BuyListApiPresenter {
    static toItem(item: BuyListItem): BuyListItemApiDto {
        if (!item.card) {
            return { cardId: item.cardId, quantity: item.quantity, isFoil: item.isFoil };
        }
        const card = item.card;
        const price = card.prices?.[0];
        return {
            cardId: item.cardId,
            quantity: item.quantity,
            isFoil: item.isFoil,
            cardName: card.name,
            setCode: card.setCode,
            cardNumber: card.number,
            imgSrc: `${BASE_IMAGE_URL}/normal/front/${card.imgSrc}`,
            rarity: card.rarity?.toLowerCase(),
            keyruneCode: card.set?.keyruneCode ?? card.setCode,
            priceNormal: price?.normal != null ? Number(price.normal) : null,
            priceFoil: price?.foil != null ? Number(price.foil) : null,
            hasNonFoil: card.hasNonFoil,
            hasFoil: card.hasFoil,
            url: buildCardUrl(card.setCode, card.number),
        };
    }
}
