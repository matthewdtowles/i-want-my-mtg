import { Type } from "class-transformer";
import { IsInt } from "class-validator";
import { CardDto } from "src/core/card/dto/card.dto";

/**
 * Inventory item for read/write operations
 * Used when card is not needed or card is in context
 */
export class InventoryDto {
    @IsInt()
    readonly cardId: number;

    @IsInt()
    readonly quantity: number;

    @IsInt()
    readonly userId: number;
}

/**
 * Inventory item for read operations with card object
 * Used when cards are not already in context
 */
export class InventoryCardDto {
    @Type(() => CardDto)
    readonly card: CardDto;
    readonly quantity: number;
    readonly userId: number;
}