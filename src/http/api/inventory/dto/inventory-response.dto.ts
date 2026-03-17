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

    @ApiPropertyOptional()
    readonly imgSrc?: string;

    @ApiPropertyOptional()
    readonly rarity?: string;

    @ApiPropertyOptional()
    readonly keyruneCode?: string;

    @ApiPropertyOptional()
    readonly priceNormal?: number;

    @ApiPropertyOptional()
    readonly priceFoil?: number;

    @ApiPropertyOptional()
    readonly tags?: string[];

    @ApiPropertyOptional()
    readonly hasNonFoil?: boolean;

    @ApiPropertyOptional()
    readonly hasFoil?: boolean;

    @ApiPropertyOptional()
    readonly url?: string;
}
