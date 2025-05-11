import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsUUID } from "class-validator";


export class CreatePriceDto {

    @IsUUID()
    @IsNotEmpty()
    cardUuid: string;

    @IsOptional()
    @IsNumber()
    foil?: number;

    @IsOptional()
    @IsNumber()
    normal?: number;

    @IsDate()
    @IsNotEmpty()
    date: Date;
}