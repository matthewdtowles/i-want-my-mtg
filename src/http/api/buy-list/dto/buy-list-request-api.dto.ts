import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/** Adjust the quantity for (card, finish) by a delta; a result <= 0 removes it. */
export class BuyListAdjustApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty()
    @IsBoolean()
    readonly isFoil: boolean;

    @ApiProperty({ description: 'Amount to add to the quantity; negative to subtract.' })
    @IsInt()
    readonly delta: number;
}

/** Add to the buy-list: increments the quantity for (card, finish). */
export class BuyListAddApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    readonly isFoil?: boolean;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly quantity?: number;
}

/** Set the absolute quantity for (card, finish); 0 removes it. */
export class BuyListSetQuantityApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty({ default: false })
    @IsBoolean()
    readonly isFoil: boolean;

    @ApiProperty({ minimum: 0 })
    @IsInt()
    @Min(0)
    readonly quantity: number;
}

export class BuyListRemoveApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty({ default: false })
    @IsBoolean()
    readonly isFoil: boolean;
}

/** Bulk paste: CSV rows with a header (name,set_code,number[,quantity][,foil]). */
export class BuyListImportApiDto {
    @ApiProperty({
        description:
            'Pasted CSV with a header row (native: name,set_code,number,quantity,foil). ' +
            'External exports (Moxfield, Archidekt, Deckbox, TCGPlayer) are auto-detected.',
    })
    @IsString()
    readonly text: string;
}
