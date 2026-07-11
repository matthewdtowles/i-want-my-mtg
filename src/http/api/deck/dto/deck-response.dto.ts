import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    readonly setCode?: string;

    @ApiPropertyOptional()
    readonly cardNumber?: string;

    @ApiPropertyOptional()
    readonly imgSrc?: string;

    @ApiPropertyOptional()
    readonly rarity?: string;

    @ApiPropertyOptional()
    readonly type?: string;

    @ApiPropertyOptional()
    readonly manaCost?: string;

    @ApiPropertyOptional()
    readonly keyruneCode?: string;

    @ApiPropertyOptional()
    readonly priceNormal?: number | null;

    @ApiPropertyOptional()
    readonly priceFoil?: number | null;

    @ApiPropertyOptional({
        description:
            'Whether the card is legal in the deck format. Null when the deck has no format.',
    })
    readonly legalInFormat?: boolean | null;

    @ApiPropertyOptional()
    readonly url?: string;
}

/** Lightweight deck row for the list endpoint. */
export class DeckSummaryApiDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    readonly name: string;

    @ApiPropertyOptional({ nullable: true })
    readonly format?: string | null;

    @ApiProperty({ description: 'Total card count (sum of quantities, main + side).' })
    readonly cardCount: number;

    @ApiProperty()
    readonly estimatedValue: number;

    @ApiProperty()
    readonly createdAt: string;

    @ApiProperty()
    readonly updatedAt: string;
}

/** One decklist line that could not be parsed or resolved. */
export class DeckImportErrorApiDto {
    @ApiProperty({ description: 'Line number in the pasted decklist (1-based).' })
    readonly row: number;

    @ApiPropertyOptional({ description: 'Card name from the line, when one was parsed.' })
    readonly name?: string;

    @ApiProperty({ description: 'Why the line was rejected.' })
    readonly error: string;
}

/** Result of a decklist text import. */
export class DeckImportApiResultDto {
    @ApiProperty({ description: 'Id of the created deck.' })
    readonly deckId: number;

    @ApiProperty()
    readonly name: string;

    @ApiProperty({ description: 'Total card quantity added across resolved lines.' })
    readonly saved: number;

    @ApiProperty({
        type: [DeckImportErrorApiDto],
        description: 'Lines that could not be parsed or resolved.',
    })
    readonly errors: DeckImportErrorApiDto[];
}

/** Result of adding a deck's missing cards to the buy-list. */
export class DeckMissingToBuyListResultDto {
    @ApiProperty({ description: 'Count of distinct cards added to the buy-list.' })
    readonly added: number;
}

/** Full deck with its cards. */
export class DeckDetailApiDto extends DeckSummaryApiDto {
    @ApiProperty({ description: 'Count of cards not legal in the deck format (0 when no format).' })
    readonly illegalCount: number;

    @ApiProperty({ type: [DeckCardApiDto] })
    readonly cards: DeckCardApiDto[];
}
