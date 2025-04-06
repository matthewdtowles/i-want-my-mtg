import { IsDate, IsPositive, IsInt, IsOptional } from "class-validator";

export class PriceDto {

    @IsPositive()
    @IsInt()
    id: number;

    @IsOptional()
    @IsPositive()
    foil: number;

    @IsOptional()
    @IsPositive()
    normal: number;

    @IsDate()
    date: Date;
}