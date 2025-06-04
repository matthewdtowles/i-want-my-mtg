import { InventoryCardHttpDto } from "src/adapters/http/http.types";
import { CardDto } from "src/core/card/api/card.dto";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { PriceDto } from "src/core/price/api/price.dto";
import { toDollar } from "src/shared/utils/formatting.util";

export class HttpMapper {

    static toInventoryCardHttpDto(inventoryDto: InventoryDto): InventoryCardHttpDto {
        const cardDto: CardDto | null = inventoryDto.card ? inventoryDto.card : null;
        const item: InventoryCardHttpDto = new InventoryCardHttpDto();
        item.isFoil = inventoryDto.isFoil;
        item.quantity = inventoryDto.quantity;
        if (cardDto) {
            item.cardId = cardDto.id;
            item.name = cardDto.name;
            item.displayValue = HttpMapper.extractDisplayValue(inventoryDto);
            item.imgSrc = cardDto.imgSrc;
            item.manaCost = cardDto.manaCost;
            item.rarity = cardDto.rarity;
        }
        return item;
    }

    private static extractDisplayValue(inventoryDto: InventoryDto): string {
        if (!inventoryDto.card || !inventoryDto.card.prices || inventoryDto.card.prices.length === 0) {
            return toDollar(0);
        }
        const latestPrice: PriceDto = inventoryDto.card.prices.reduce((latest, current) => {
            return current.date > latest.date ? current : latest;
        });
        const displayValue: string = toDollar(inventoryDto.isFoil ? latestPrice.foil : latestPrice.normal);
        return displayValue || toDollar(0);
    }
}