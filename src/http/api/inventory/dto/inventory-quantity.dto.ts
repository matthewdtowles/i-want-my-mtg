import { ApiProperty } from '@nestjs/swagger';

export class InventoryQuantityApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty()
    readonly foilQuantity: number;

    @ApiProperty()
    readonly normalQuantity: number;
}
