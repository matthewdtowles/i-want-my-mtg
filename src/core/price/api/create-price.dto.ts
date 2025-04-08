import { IsDate, IsOptional, IsPositive, IsUUID, Matches } from "class-validator";


export class CreatePriceDto {

    private static readonly USD_REGEX = /^\$?[0-9]{1,3}(\.[0-9]{1,2})?$/;

    @IsUUID()
    cardUuid: string;

    @IsOptional()
    @Matches(CreatePriceDto.USD_REGEX, {
        message: "Foil price must be a number with up to 2 decimal places",
    })
    foil?: number;

    @IsOptional()
    @Matches(CreatePriceDto.USD_REGEX, {
        message: "Normal price must be a number with up to 2 decimal places",
    })
    normal?: number;

    @IsDate()
    date: Date;
}