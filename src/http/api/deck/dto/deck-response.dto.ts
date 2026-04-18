import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Format } from 'src/core/card/format.enum';

export class DeckCardApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly quantity: number;

    @ApiProperty()
    readonly isSideboard: boolean;

    @ApiPropertyOptional()
    readonly cardName?: string;

    @ApiPropertyOptional()
    readonly cardNumber?: string;

    @ApiPropertyOptional()
    readonly setCode?: string;

    @ApiPropertyOptional()
    readonly imgSrc?: string;

    @ApiPropertyOptional()
    readonly type?: string;

    @ApiPropertyOptional()
    readonly manaCost?: string;

    @ApiPropertyOptional()
    readonly price?: number | null;
}

export class DeckApiDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    readonly name: string;

    @ApiPropertyOptional({ enum: Format })
    readonly format: Format | null;

    @ApiPropertyOptional()
    readonly description: string | null;

    @ApiProperty()
    readonly cardCount: number;

    @ApiProperty()
    readonly sideboardCount: number;

    @ApiProperty()
    readonly createdAt: Date;

    @ApiProperty()
    readonly updatedAt: Date;

    @ApiPropertyOptional({ type: [DeckCardApiDto] })
    readonly cards?: DeckCardApiDto[];
}
