import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BuyListItemApiDto {
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
    readonly priceNormal?: number | null;

    @ApiPropertyOptional()
    readonly priceFoil?: number | null;

    @ApiPropertyOptional()
    readonly hasNonFoil?: boolean;

    @ApiPropertyOptional()
    readonly hasFoil?: boolean;

    @ApiPropertyOptional()
    readonly url?: string;
}

export class BuyListImportResponseDto {
    @ApiProperty()
    readonly saved: number;

    @ApiProperty()
    readonly errors: Array<{ row: number; name?: string; error: string }>;

    constructor(init: BuyListImportResponseDto) {
        this.saved = init.saved;
        this.errors = init.errors;
    }
}
