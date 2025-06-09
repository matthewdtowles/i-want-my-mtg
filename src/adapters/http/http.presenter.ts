import { CardResponseDto, InventoryCardResponseDto } from "src/adapters/http/http.types";
import { Card, CardDto } from "src/core/card";
import { InventoryDto } from "src/core/inventory";
import { PriceDto } from "src/core/price";
import { toDollar } from "src/shared/utils/formatting.util";

export class HttpPresenter {

    static toInventoryCardHttpDto(inventoryDto: InventoryDto): InventoryCardResponseDto {
        const cardDto: CardDto | null = inventoryDto.card ? inventoryDto.card : null;
        const item: InventoryCardResponseDto = new InventoryCardResponseDto();
        item.isFoil = inventoryDto.isFoil;
        item.quantity = inventoryDto.quantity;
        if (cardDto) {
            item.cardId = cardDto.order;
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

    static toCardResponseDto(cards: Card[]): CardResponseDto[] {
        return cards.map((card: Card) => {
            const dto: CardResponseDto = new CardResponseDto();
            dto.cardId = card.id;
            dto.artist = card.artist;
            // dto.hasFoil = card.hasFoil;
            // dto.hasNonFoil = card.hasNonFoil;
            dto.imgSrc = card.imgSrc;
            dto.isReserved = card.isReserved;
            // dto.legalities = card.legalities;
            // dto.manaCost = card.manaCost;
            dto.name = card.name;
            dto.number = card.number;
            dto.oracleText = card.oracleText;
            // dto.prices = Array.isArray(card.prices) ? card.prices : [];
            dto.rarity = card.rarity;
            dto.setCode = card.setCode;
            dto.type = card.type;
            // dto.url = card.url;

            return dto;
        });
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