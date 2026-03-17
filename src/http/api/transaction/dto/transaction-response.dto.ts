import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionApiItemDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly type: string;

    @ApiProperty()
    readonly quantity: number;

    @ApiProperty()
    readonly pricePerUnit: number;

    @ApiProperty()
    readonly isFoil: boolean;

    @ApiProperty()
    readonly date: string;

    @ApiPropertyOptional()
    readonly source?: string;

    @ApiPropertyOptional()
    readonly fees?: number;

    @ApiPropertyOptional()
    readonly notes?: string;

    @ApiPropertyOptional()
    readonly cardName?: string;

    @ApiPropertyOptional()
    readonly setCode?: string;

    @ApiPropertyOptional()
    readonly cardUrl?: string;

    @ApiPropertyOptional()
    readonly cardNumber?: string;

    @ApiPropertyOptional()
    readonly editable?: boolean;
}

export class CostBasisApiDto {
    @ApiProperty()
    readonly totalCost: number;

    @ApiProperty()
    readonly totalQuantity: number;

    @ApiProperty()
    readonly averageCost: number;

    @ApiProperty()
    readonly unrealizedGain: number;

    @ApiProperty()
    readonly realizedGain: number;
}
