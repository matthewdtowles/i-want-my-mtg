import { ApiProperty } from '@nestjs/swagger';

/** Result of a delta-quantity adjustment (inventory or buy-list). */
export class AdjustedQuantityApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly isFoil: boolean;

    @ApiProperty({ description: 'Quantity after the adjustment; 0 means the row was removed.' })
    readonly quantity: number;
}
