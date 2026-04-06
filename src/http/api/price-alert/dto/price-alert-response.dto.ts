import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceAlertApiDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    readonly cardId: string;

    @ApiPropertyOptional()
    readonly cardName?: string;

    @ApiPropertyOptional()
    readonly cardNumber?: string;

    @ApiPropertyOptional()
    readonly setCode?: string;

    @ApiPropertyOptional()
    readonly increasePct: number | null;

    @ApiPropertyOptional()
    readonly decreasePct: number | null;

    @ApiProperty()
    readonly isActive: boolean;

    @ApiPropertyOptional()
    readonly lastNotifiedAt: Date | null;

    @ApiProperty()
    readonly createdAt: Date;

    @ApiProperty()
    readonly updatedAt: Date;
}
