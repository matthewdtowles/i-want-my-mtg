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

    @ApiPropertyOptional({
        description:
            "Cover art tail for the set's most valuable card, in the same form as a card's " +
            '`imgSrc`. Lets a client render set artwork from the list response instead of ' +
            'fetching a card per set. Absent when the set has no card image.',
    })
    readonly coverImgSrc?: string;

    @ApiPropertyOptional()
    readonly block?: string;

    @ApiPropertyOptional()
    readonly parentCode?: string;

    @ApiProperty()
    readonly isMain: boolean;

    @ApiProperty({ type: [String] })
    readonly tags: string[];

    @ApiPropertyOptional({ type: SetPriceApiDto })
    readonly prices?: SetPriceApiDto;

    @ApiPropertyOptional()
    readonly ownedTotal?: number;

    @ApiPropertyOptional()
    readonly ownedValue?: number;

    @ApiPropertyOptional()
    readonly completionRate?: number;
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
