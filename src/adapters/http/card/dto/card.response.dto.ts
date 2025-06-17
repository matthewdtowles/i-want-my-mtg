import { CardInventoryInfo } from "src/adapters/http/card/dto/card.inventory.info";
import { PriceResponseDto } from "src/adapters/http/price/price.response.dto";

// Base card response DTO for HBS views
export class CardResponseDto {
    readonly cardId: string;
    readonly imgSrc: string;
    readonly inventoryInfo?: CardInventoryInfo;
    readonly isReserved: boolean;
    readonly manaCost: string[];
    readonly name: string;
    readonly number: string;
    readonly price?: PriceResponseDto;
    readonly rarity: string;
    readonly setCode: string;
    readonly type: string;
    readonly url: string;

    constructor(init: Partial<CardResponseDto>) {
        this.cardId = init.cardId || "";
        this.imgSrc = init.imgSrc || "";
        this.isReserved = init.isReserved || false;
        this.manaCost = init.manaCost || [];
        this.name = init.name || "";
        this.number = init.number || "";
        this.price = init.price ? new PriceResponseDto(init.price) : undefined;
        this.rarity = init.rarity || "";
        this.setCode = init.setCode || "";
        this.type = init.type || "";
        this.url = init.url || "";
    }
}