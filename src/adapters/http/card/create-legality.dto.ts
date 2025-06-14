import { IsEnum, IsInt, IsPositive } from "class-validator";
import { Format } from "src/core/card/format.enum";
import { LegalityStatus } from "src/core/card/legality.status.enum";


export class CreateLegalityDto {
    @IsInt()
    @IsPositive()
    cardId: string;

    @IsEnum(Format)
    readonly format: string;

    @IsEnum(LegalityStatus)
    readonly status: string;
}