import { IsBoolean, IsInt, IsUUID } from 'class-validator';

/**
 * API-specific inventory request DTO.
 * Excludes userId — the API sets it from the JWT token.
 */
export class InventoryRequestApiDto {
    @IsUUID()
    readonly cardId: string;

    @IsInt()
    readonly quantity: number;

    @IsBoolean()
    readonly isFoil: boolean;
}
