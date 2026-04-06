import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceNotificationApiDto {
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
    readonly alertId: number | null;

    @ApiProperty()
    readonly direction: string;

    @ApiProperty()
    readonly oldPrice: number;

    @ApiProperty()
    readonly newPrice: number;

    @ApiProperty()
    readonly changePct: number;

    @ApiProperty()
    readonly isRead: boolean;

    @ApiProperty()
    readonly createdAt: Date;
}
