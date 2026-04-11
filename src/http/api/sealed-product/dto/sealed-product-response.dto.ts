import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SealedProductPriceDto {
    @ApiPropertyOptional({ type: Number, nullable: true })
    price?: number | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    priceChangeWeekly?: number | null;

    @ApiProperty()
    date: string;
}

export class SealedProductApiResponseDto {
    @ApiProperty()
    uuid: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    setCode: string;

    @ApiPropertyOptional()
    category?: string;

    @ApiPropertyOptional()
    subtype?: string;

    @ApiPropertyOptional()
    cardCount?: number;

    @ApiPropertyOptional()
    productSize?: number;

    @ApiPropertyOptional()
    releaseDate?: string;

    @ApiPropertyOptional()
    contentsSummary?: string;

    @ApiPropertyOptional()
    purchaseUrlTcgplayer?: string;

    @ApiPropertyOptional()
    tcgplayerProductId?: string;

    @ApiPropertyOptional({ type: SealedProductPriceDto })
    price?: SealedProductPriceDto;

    @ApiPropertyOptional({
        description: 'Authenticated user\'s owned quantity; omitted when not logged in',
    })
    ownedQuantity?: number;
}

export class SealedProductPriceHistoryPointDto {
    @ApiPropertyOptional({ type: Number, nullable: true })
    price: number | null;

    @ApiProperty()
    date: string;
}

export class SealedProductInventoryApiDto {
    @ApiProperty()
    sealedProductUuid: string;

    @ApiProperty()
    quantity: number;

    @ApiPropertyOptional({ type: SealedProductApiResponseDto })
    sealedProduct?: SealedProductApiResponseDto;
}
