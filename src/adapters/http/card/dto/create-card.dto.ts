import {
    IsBoolean,
    IsEnum,
    IsLowercase,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString
} from "class-validator";
import { LegalityResponseDto } from "src/adapters/http/card/dto/legality.response.dto";
import { CardRarity } from "src/core/card/card.rarity.enum";


export class CreateCardDto {
    @IsString()
    @IsNotEmpty()
    readonly uuid: string;

    @IsOptional()
    @IsString()
    readonly artist?: string;

    @IsBoolean()
    @IsNotEmpty()
    readonly hasFoil: boolean;

    @IsBoolean()
    @IsNotEmpty()
    readonly hasNonFoil: boolean;

    @IsString()
    @IsNotEmpty()
    readonly imgSrc: string;

    @IsBoolean()
    readonly isReserved: boolean;

    @IsOptional()
    readonly legalities?: LegalityResponseDto[];

    @IsOptional()
    @IsString()
    readonly manaCost?: string;

    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @IsNumber()
    @IsNotEmpty()
    readonly number: string;

    @IsOptional()
    @IsString()
    readonly oracleText?: string;

    @IsEnum(CardRarity)
    @IsNotEmpty()
    readonly rarity: string;

    @IsLowercase()
    @IsString()
    @IsNotEmpty()
    readonly setCode: string;

    @IsString()
    @IsNotEmpty()
    readonly type: string;
}