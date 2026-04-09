import { ApiProperty } from '@nestjs/swagger';

export class SealedInventoryRequestDto {
    @ApiProperty()
    sealedProductUuid: string;

    @ApiProperty()
    quantity: number;
}
