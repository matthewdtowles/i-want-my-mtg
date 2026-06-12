import { Card } from 'src/core/card/card.entity';
import { Price } from 'src/core/card/price.entity';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { SellPlan } from 'src/core/pricing/sell-value.policy';
import { vendorBuylistUrl, vendorDisplayName } from 'src/core/pricing/vendor';
import { BASE_IMAGE_URL, buildCardUrl, toDollar } from 'src/http/base/http.util';
import { CardPresenter } from 'src/http/hbs/card/card.presenter';
import { InventoryRequestDto } from './dto/inventory.request.dto';
import { InventoryResponseDto } from './dto/inventory.response.dto';
import { SellVendorGroupView } from './dto/inventory-sell.view.dto';
import { InventoryQuantities } from './inventory.quantities';

export class InventoryPresenter {
    /**
     * This is used for creating or updating inventory items in the database.
     * @param inventoryItems
     * @param userId
     * @returns a list of Inventory entities based on the provided DTOs and userId.
     */
    static toEntities(inventoryItems: InventoryRequestDto[], userId: number): Inventory[] {
        return inventoryItems.map((item: InventoryRequestDto) => this.toEntity(item, userId));
    }

    /**
     * Converts a single InventoryRequestDto to an Inventory entity.
     * This is used for creating or updating a single inventory item in the database.
     *
     * @param dto - The InventoryRequestDto to convert.
     * @param userId - The ID of the user who owns the inventory item.
     * @returns An Inventory entity.
     */
    static toEntity(dto: InventoryRequestDto, userId: number): Inventory {
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: userId,
        });
    }

    static toInventoryResponseDto(inventory: Inventory): InventoryResponseDto {
        if (!inventory) {
            throw new Error('Inventory is required to create InventoryResponseDto');
        }
        if (!inventory.card) {
            throw new Error('Inventory must have a card to create InventoryResponseDto');
        }
        // extract the price value from card prices where price is for foil if isFoil is true, otherwise normal price
        const card: Card = inventory.card;
        const priceObj: Price = card?.prices[0];
        const priceValueRaw: number = inventory.isFoil ? priceObj?.foil : priceObj?.normal;
        return new InventoryResponseDto({
            cardId: inventory.cardId,
            isFoil: inventory.isFoil,
            quantity: inventory.quantity,
            priceValue: toDollar(priceValueRaw),
            imgSrc: `${BASE_IMAGE_URL}/normal/front/${card.imgSrc}`,
            name: card.name,
            rarity: card.rarity,
            setCode: card.setCode,
            url: buildCardUrl(card.setCode, card.number),
            tags: CardPresenter.createTags(card),
        });
    }

    /**
     * Vendor groups for the market sell value view (6.4). The policy already
     * sorts groups and items by payout descending; this only formats.
     */
    static toSellVendorGroups(plan: SellPlan): SellVendorGroupView[] {
        return plan.groups.map((group) => ({
            vendor: vendorDisplayName(group.provider),
            payout: toDollar(group.payout),
            payoutRaw: group.payout,
            itemCount: group.items.length,
            items: group.items.map((item) => {
                const card = item.inventory.card;
                return {
                    key: `${item.inventory.cardId}:${item.inventory.isFoil ? 'f' : 'n'}`,
                    name: card?.name ?? '',
                    url: card ? buildCardUrl(card.setCode, card.number) : '',
                    setCode: card?.setCode ?? '',
                    isFoil: item.inventory.isFoil,
                    quantity: item.inventory.quantity,
                    sellableQuantity: item.sellableQuantity,
                    quantityCapped: item.quantityCapped,
                    offerPrice: toDollar(item.offer.price),
                    payout: toDollar(item.payout),
                    payoutRaw: item.payout,
                    vendorUrl: vendorBuylistUrl(group.provider, card?.name ?? ''),
                };
            }),
        }));
    }

    /**
     * @param inventory
     * @returns map of cardId to foil and normal quantities owned by the user.
     */
    static toQuantityMap(inventory: Inventory[]): Map<string, InventoryQuantities> {
        const quantityMap: Map<string, InventoryQuantities> = new Map<
            string,
            InventoryQuantities
        >();
        for (const item of inventory) {
            const key: string = item.cardId;
            const existing: InventoryQuantities =
                quantityMap.get(key) || new InventoryQuantities(0, 0);
            if (item.isFoil) {
                existing.foilQuantity += item.quantity;
            } else {
                existing.normalQuantity += item.quantity;
            }
            quantityMap.set(key, existing);
        }
        return quantityMap;
    }
}
