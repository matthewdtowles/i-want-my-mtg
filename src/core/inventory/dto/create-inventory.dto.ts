import { IsInt, IsOptional } from 'class-validator';

export class CreateInventoryDto {

    @IsInt()
    readonly cardId: number;

    @IsInt()
    @IsOptional()
    readonly quantity: number;

    @IsInt()
    readonly userId: number;
}