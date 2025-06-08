import { CardResponseDto, InventoryCardResponseDto } from "src/adapters/http/http.types";
import { CardDto } from "src/core/card/api/card.dto";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { PriceDto } from "src/core/price/api/price.dto";
import { toDollar } from "src/shared/utils/formatting.util";

export class HttpPresenter {

    static toInventoryCardHttpDto(inventoryDto: InventoryDto): InventoryCardResponseDto {
        const cardDto: CardDto | null = inventoryDto.card ? inventoryDto.card : null;
        const item: InventoryCardResponseDto = new InventoryCardResponseDto();
        item.isFoil = inventoryDto.isFoil;
        item.quantity = inventoryDto.quantity;
        if (cardDto) {
            item.cardId = cardDto.id;
            item.displayValue = HttpPresenter.extractDisplayValue(inventoryDto);
            item.imgSrc = cardDto.imgSrc;
            item.isReserved = cardDto.isReserved;
            item.manaCost = cardDto.manaCost;
            item.name = cardDto.name;
            item.rarity = cardDto.rarity;
            item.setCode = cardDto.setCode;
            item.url = cardDto.url;
        }
        return item;
    }

    static toCardResponseDto(inventoryDtos: InventoryDto[]): CardResponseDto[] {

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