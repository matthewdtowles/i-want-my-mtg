import { IsEnum, IsInt, IsPositive } from "class-validator";
import { Format } from "src/core/card/api/format.enum";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";


export class LegalityDto {
    @IsInt()
    @IsPositive()
    cardId: number;

    @IsEnum(Format)
    readonly format: string;

    @IsEnum(LegalityStatus)
    readonly status: string;
}