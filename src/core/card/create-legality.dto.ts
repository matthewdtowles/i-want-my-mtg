import { IsEnum, IsInt, IsPositive } from "class-validator";
import { Format, LegalityStatus } from "src/core/card";


export class CreateLegalityDto {
    @IsInt()
    @IsPositive()
    cardId: string;

    @IsEnum(Format)
    readonly format: string;

    @IsEnum(LegalityStatus)
    readonly status: string;
}