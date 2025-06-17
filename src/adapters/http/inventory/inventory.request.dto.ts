import { IsBoolean, IsInt, IsUUID } from "class-validator";


/**
 * Inventory item for read/write operations
 */
export class InventoryRequestDto {
    @IsUUID()
    cardId: string;

    @IsInt()
    quantity: number;

    @IsBoolean()
    isFoil: boolean;

    @IsInt()
    userId: number;
}