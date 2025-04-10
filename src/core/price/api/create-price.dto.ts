import { IsDate, IsEnum, IsOptional, IsUUID, Matches } from "class-validator";
import { Provider } from "src/core/price/api/provider.enum";


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

    @IsEnum(Provider)
    provider: Provider;
}