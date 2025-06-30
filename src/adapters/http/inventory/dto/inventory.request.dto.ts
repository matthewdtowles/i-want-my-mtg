import { IsBoolean, IsInt, IsUUID } from "class-validator";


/**
 * Inventory item for read/write operations
 */
export class InventoryRequestDto {
    @IsUUID()
    readonly cardId: string;

    @IsInt()
    readonly quantity: number;

    @IsBoolean()
    readonly isFoil: boolean;

    @IsInt()
    readonly userId: number;
}