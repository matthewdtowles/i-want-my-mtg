import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsUUID } from 'class-validator';

/**
 * API-specific inventory delete request DTO.
 * Identifies the inventory row by card and finish; userId comes from the JWT.
 */
export class InventoryDeleteApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty()
    @IsBoolean()
    readonly isFoil: boolean;
}
