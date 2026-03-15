import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryItemApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly quantity: number;

    @ApiProperty()
    readonly isFoil: boolean;

    @ApiPropertyOptional()
    readonly cardName?: string;

    @ApiPropertyOptional()
    readonly setCode?: string;

    @ApiPropertyOptional()
    readonly cardNumber?: string;
}
