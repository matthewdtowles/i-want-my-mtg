import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Format } from 'src/core/card/format.enum';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

/** Create a deck. */
export class DeckCreateApiDto {
    @ApiProperty()
    @IsString()
    readonly name: string;

    @ApiPropertyOptional({ enum: Format, description: 'Target format (omit for no format).' })
    @IsOptional()
    @IsEnum(Format)
    readonly format?: Format;
}

/** Rename / re-format a deck. */
export class DeckUpdateApiDto {
    @ApiProperty()
    @IsString()
    readonly name: string;

    @ApiPropertyOptional({ enum: Format, description: 'Target format (omit to clear).' })
    @IsOptional()
    @IsEnum(Format)
    readonly format?: Format;
}

/** Create a deck from pasted decklist text. */
export class DeckImportApiDto {
    @ApiProperty()
    @IsString()
    readonly name: string;

    @ApiPropertyOptional({ enum: Format, description: 'Target format (omit for no format).' })
    @IsOptional()
    @IsEnum(Format)
    readonly format?: Format;

    @ApiProperty({ description: 'Decklist text, one entry per line (e.g. "4 Lightning Bolt").' })
    @IsString()
    readonly text: string;
}

/** Add a card to a deck (increments quantity for card + board). */
export class DeckCardAddApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    readonly isSideboard?: boolean;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly quantity?: number;
}

/** Set the absolute quantity for a card + board; 0 removes it. */
export class DeckCardSetQuantityApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty()
    @IsBoolean()
    readonly isSideboard: boolean;

    @ApiProperty({ minimum: 0 })
    @IsInt()
    @Min(0)
    readonly quantity: number;
}

/** Remove a card + board from a deck. */
export class DeckCardRemoveApiDto {
    @ApiProperty()
    @IsUUID()
    readonly cardId: string;

    @ApiProperty()
    @IsBoolean()
    readonly isSideboard: boolean;
}
