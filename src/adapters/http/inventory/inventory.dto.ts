import { IsBoolean, IsInt, IsObject, IsOptional } from "class-validator";
import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";

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
    card?: CardResponseDto;
}