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

    @ApiPropertyOptional()
    readonly flavorName?: string;

    @ApiProperty()
    readonly imgSrc: string;

    @ApiProperty()
    readonly hasFoil: boolean;

    @ApiProperty()
    readonly hasNonFoil: boolean;

    @ApiPropertyOptional({ type: CardPriceDto })
    readonly prices?: CardPriceDto;

    @ApiPropertyOptional({
        description: 'Best NM buylist (sell-to-vendor) offer in USD; null when none',
        nullable: true,
    })
    readonly bestBuylist?: number | null;

    @ApiPropertyOptional({
        description:
            "Finish of the best buylist offer when it is not the default 'normal' (e.g. 'foil', 'etched'); null otherwise",
        nullable: true,
    })
    readonly bestBuylistFinish?: string | null;

    @ApiPropertyOptional()
    readonly setName?: string;

    @ApiPropertyOptional()
    readonly keyruneCode?: string;

    @ApiPropertyOptional({ description: 'Affiliate-wrapped TCGPlayer purchase URL (normal/foil)' })
    readonly purchaseUrlTcgplayer?: string;

    @ApiPropertyOptional({ description: 'Affiliate-wrapped TCGPlayer purchase URL for etched finish' })
    readonly purchaseUrlTcgplayerEtched?: string;
}

export class PriceHistoryPointDto {
    @ApiProperty()
    readonly date: string;

    @ApiPropertyOptional()
    readonly normal: number | null;

    @ApiPropertyOptional()
    readonly foil: number | null;
}
