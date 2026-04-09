import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SealedProductPriceDto {
    @ApiPropertyOptional()
    price?: number;

    @ApiPropertyOptional()
    priceChangeWeekly?: number;

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

    @ApiPropertyOptional({ type: SealedProductPriceDto })
    price?: SealedProductPriceDto;
}

export class SealedProductPriceHistoryPointDto {
    @ApiPropertyOptional()
    price?: number;

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
