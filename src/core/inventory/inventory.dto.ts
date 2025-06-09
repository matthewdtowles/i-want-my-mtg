import { IsBoolean, IsInt, IsObject, IsOptional } from "class-validator";
import { CardDto } from "src/core/card";

/**
 * Inventory item for read/write operations
 */
export class InventoryDto {
    @IsInt()
    cardId: string;

    @IsInt()
    quantity: number;

    @IsBoolean()
    isFoil: boolean;

    @IsInt()
    userId: number;

    @IsOptional()
    @IsObject()
    card?: CardDto;
}