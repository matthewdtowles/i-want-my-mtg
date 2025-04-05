import { IsDate, IsPositive, IsInt } from "class-validator";

export class PriceDto {

    @IsPositive()
    @IsInt()
    id: number;

    @IsPositive()
    @IsInt()
    cardId: number;

    @IsPositive()
    foilValue: number;

    @IsPositive()
    normalValue: number;

    @IsDate()
    lastUpdatedAt: Date;
}