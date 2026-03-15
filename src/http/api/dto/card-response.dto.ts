import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CardPriceDto {
    @ApiPropertyOptional()
    readonly normal?: number | null;

    @ApiPropertyOptional()
    readonly foil?: number | null;

    @ApiPropertyOptional()
    readonly normalChangeWeekly?: number | null;

    @ApiPropertyOptional()
    readonly foilChangeWeekly?: number | null;
}

export class CardApiResponseDto {
    @ApiProperty()
    readonly id: string;

    @ApiProperty()
    readonly name: string;

    @ApiProperty()
    readonly setCode: string;

    @ApiProperty()
    readonly number: string;

    @ApiProperty()
    readonly type: string;

    @ApiProperty()
    readonly rarity: string;

    @ApiPropertyOptional()
    readonly manaCost?: string;

    @ApiPropertyOptional()
    readonly oracleText?: string;

    @ApiPropertyOptional()
    readonly artist?: string;

    @ApiProperty()
    readonly imgSrc: string;

    @ApiProperty()
    readonly hasFoil: boolean;

    @ApiProperty()
    readonly hasNonFoil: boolean;

    @ApiPropertyOptional({ type: CardPriceDto })
    readonly prices?: CardPriceDto;

    @ApiPropertyOptional()
    readonly setName?: string;
}

export class PriceHistoryPointDto {
    @ApiProperty()
    readonly date: string;

    @ApiPropertyOptional()
    readonly normal: number | null;

    @ApiPropertyOptional()
    readonly foil: number | null;
}
