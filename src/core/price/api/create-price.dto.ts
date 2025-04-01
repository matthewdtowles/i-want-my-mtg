import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsUUID, Matches } from "class-validator";

export class CreatePriceDto {

    @IsNotEmpty()
    @IsUUID()
    cardUuid: string;

    @IsOptional()
    @Matches(/^[0-9]{1,3}(\.[0-9]{1,2})?$/, {
        message: "Foil price must be a number with up to 2 decimal places",
    })
    foil?: number;

    @IsOptional()
    @Matches(/^[0-9]{1,3}(\.[0-9]{1,2})?$/, {
        message: "Normal price must be a number with up to 2 decimal places",
    })
    normal?: number;

    @IsNotEmpty()
    @IsDate()
    lastUpdatedAt: Date;
}