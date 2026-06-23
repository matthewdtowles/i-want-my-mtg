import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsUUID } from 'class-validator';

/**
 * API-specific inventory request DTO.
 * Excludes userId - the API sets it from the JWT token.
 */
export class InventoryRequestApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty({ description: 'Absolute quantity to set; 0 removes the row' })
    @IsInt()
    readonly quantity: number;

    @ApiProperty()
    @IsBoolean()
    readonly isFoil: boolean;
}
