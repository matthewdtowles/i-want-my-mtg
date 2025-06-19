import { InventoryCardResponseDto } from "src/adapters/http/inventory/inventory.response.dto";
import { Card } from "src/core/card/card.entity";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Price } from "src/core/price/price.entity";
import { toDollar } from "src/shared/utils/formatting.util";

export class HttpPresenter {

    static toInventoryCardHttpDto(coreItem: Inventory): InventoryCardResponseDto {
        const card: Card | null = coreItem.card ? coreItem.card : null;
        const item: InventoryCardResponseDto = new InventoryCardResponseDto();
        item.isFoil = coreItem.isFoil;
        item.quantity = coreItem.quantity;
        if (card) {
            item.cardId = card.order;
            item.displayValue = HttpPresenter.extractDisplayValue(coreItem);
            item.imgSrc = card.imgSrc;
            item.isReserved = card.isReserved;
            // MAP MANA COST
            // item.manaCost = card.manaCost;
            item.name = card.name;
            item.rarity = card.rarity;
            item.setCode = card.setCode;
            // TODO: MAP card url
            // item.url = card.url;
        }
        return item;
    }

    private static extractDisplayValue(coreItem: Inventory): string {
        if (!coreItem.card || !coreItem.card.prices || coreItem.card.prices.length === 0) {
            return toDollar(0);
        }
        const latestPrice: Price = coreItem.card.prices.reduce((latest, current) => {
            return current.date > latest.date ? current : latest;
        });
        const displayValue: string = toDollar(coreItem.isFoil ? latestPrice.foil : latestPrice.normal);
        return displayValue || toDollar(0);
    }
}