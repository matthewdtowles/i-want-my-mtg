import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetPriceApiDto {
    @ApiPropertyOptional()
    readonly basePrice?: number | null;

    @ApiPropertyOptional()
    readonly totalPrice?: number | null;

    @ApiPropertyOptional()
    readonly basePriceAll?: number | null;

    @ApiPropertyOptional()
    readonly totalPriceAll?: number | null;

    @ApiPropertyOptional()
    readonly basePriceChangeWeekly?: number | null;

    @ApiPropertyOptional()
    readonly totalPriceChangeWeekly?: number | null;
}

export class SetApiResponseDto {
    @ApiProperty()
    readonly code: string;

    @ApiProperty()
    readonly name: string;

    @ApiProperty()
    readonly type: string;

    @ApiProperty()
    readonly releaseDate: string;

    @ApiProperty()
    readonly baseSize: number;

    @ApiProperty()
    readonly totalSize: number;

    @ApiProperty()
    readonly keyruneCode: string;

    @ApiPropertyOptional()
    readonly block?: string;

    @ApiPropertyOptional({ type: SetPriceApiDto })
    readonly prices?: SetPriceApiDto;
}

export class SetPriceHistoryPointDto {
    @ApiProperty()
    readonly date: string;

    @ApiPropertyOptional()
    readonly basePrice: number | null;

    @ApiPropertyOptional()
    readonly totalPrice: number | null;

    @ApiPropertyOptional()
    readonly basePriceAll: number | null;

    @ApiPropertyOptional()
    readonly totalPriceAll: number | null;
}
