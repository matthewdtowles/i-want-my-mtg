import { Inventory } from 'src/core/inventory/inventory.entity';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { BASE_IMAGE_URL, buildCardUrl } from 'src/http/base/http.util';
import { InventoryItemApiDto } from './dto/inventory-response.dto';
import { InventoryQuantityApiDto } from './dto/inventory-quantity.dto';

export class InventoryApiPresenter {
    static toInventoryItem(item: Inventory): InventoryItemApiDto {
        if (!item.card) {
            return {
                cardId: item.cardId,
                quantity: item.quantity,
                isFoil: item.isFoil,
            };
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
            tags: CardPresenter.createTags(card),
            hasNonFoil: card.hasNonFoil,
            hasFoil: card.hasFoil,
            url: buildCardUrl(card.setCode, card.number),
        };
    }

    static toQuantityResponse(items: Inventory[]): InventoryQuantityApiDto[] {
        const map = new Map<string, { foilQuantity: number; normalQuantity: number }>();

        for (const item of items) {
            const existing = map.get(item.cardId) || { foilQuantity: 0, normalQuantity: 0 };
            if (item.isFoil) {
                existing.foilQuantity += item.quantity;
            } else {
                existing.normalQuantity += item.quantity;
            }
            map.set(item.cardId, existing);
        }

        return Array.from(map.entries()).map(([cardId, quantities]) => ({
            cardId,
            foilQuantity: quantities.foilQuantity,
            normalQuantity: quantities.normalQuantity,
        }));
    }
}
