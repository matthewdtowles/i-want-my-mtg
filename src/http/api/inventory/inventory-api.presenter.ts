import { Inventory } from 'src/core/inventory/inventory.entity';
import { SellPlan } from 'src/core/pricing/sell-value.policy';
import { vendorDisplayName } from 'src/core/pricing/vendor';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { BASE_IMAGE_URL, buildCardUrl } from 'src/http/base/http.util';
import { InventoryItemApiDto } from './dto/inventory-response.dto';
import { InventoryQuantityApiDto } from './dto/inventory-quantity.dto';
import { InventorySellApiResponseDto } from './dto/inventory-sell-response.dto';

export class InventoryApiPresenter {
    /** Market sell value plan (6.4) as structured JSON — same SellPlan the sell page renders. */
    static toSellPlan(plan: SellPlan): InventorySellApiResponseDto {
        return {
            totalPayout: plan.totalPayout,
            itemsWithOffers: plan.itemsWithOffers,
            itemsWithoutOffers: plan.itemsWithoutOffers,
            groups: plan.groups.map((group) => ({
                provider: group.provider,
                vendor: vendorDisplayName(group.provider),
                payout: group.payout,
                items: group.items.map((item) => {
                    const card = item.inventory.card;
                    return {
                        cardId: item.inventory.cardId,
                        cardName: card?.name,
                        setCode: card?.setCode,
                        number: card?.number,
                        finish: item.inventory.isFoil ? 'foil' : 'normal',
                        ownedQuantity: item.inventory.quantity,
                        sellableQuantity: item.sellableQuantity,
                        quantityCapped: item.quantityCapped,
                        offer: item.offer.price as number,
                        payout: item.payout,
                    };
                }),
            })),
        };
    }

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
