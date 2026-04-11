import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class SealedInventoryRequestDto {
    @ApiProperty()
    @IsUUID()
    sealedProductUuid: string;

    @ApiProperty()
    @IsInt()
    @Min(1)
    quantity: number;
}

export class SealedInventoryDeleteRequestDto {
    @ApiProperty()
    @IsUUID()
    sealedProductUuid: string;
}
