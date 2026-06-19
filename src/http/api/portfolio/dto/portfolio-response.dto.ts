import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioSummaryApiDto {
    @ApiProperty()
    readonly totalValue: number;

    @ApiPropertyOptional()
    readonly totalCost: number | null;

    @ApiPropertyOptional()
    readonly totalRealizedGain: number | null;

    @ApiProperty()
    readonly totalCards: number;

    @ApiProperty()
    readonly totalQuantity: number;

    @ApiProperty()
    readonly computedAt: string;
}

export class PortfolioHistoryPointDto {
    @ApiProperty()
    readonly date: string;

    @ApiProperty()
    readonly totalValue: number;

    @ApiPropertyOptional()
    readonly totalCost: number | null;

    @ApiProperty()
    readonly totalCards: number;
}

export class CardPerformanceApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiPropertyOptional()
    readonly cardName?: string;

    @ApiPropertyOptional()
    readonly setCode?: string;

    @ApiProperty()
    readonly quantity: number;

    @ApiProperty()
    readonly costBasis: number;

    @ApiProperty()
    readonly currentValue: number;

    @ApiProperty()
    readonly gain: number;

    @ApiProperty()
    readonly roi: number;
}

export class BreakdownCardApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly name: string;

    @ApiProperty()
    readonly setCode: string;

    @ApiProperty()
    readonly number: string;

    @ApiProperty({ description: 'Path to the card detail page' })
    readonly cardUrl: string;

    @ApiProperty({ description: 'Full Scryfall image URL for hover preview (may be empty)' })
    readonly imgSrc: string;

    @ApiProperty()
    readonly rarity: string;

    @ApiProperty({ description: 'Total quantity owned (foil + non-foil combined)' })
    readonly quantity: number;

    @ApiProperty({ description: 'Combined current value across foil + non-foil' })
    readonly value: number;

    @ApiProperty({ description: 'Pre-formatted value, e.g. "$12.34"' })
    readonly valueFormatted: string;
}

export class CashFlowPeriodApiDto {
    @ApiProperty()
    readonly period: string;

    @ApiProperty()
    readonly totalBought: number;

    @ApiProperty()
    readonly totalSold: number;

    @ApiProperty()
    readonly net: number;
}
