import { PartialType } from "@nestjs/mapped-types";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsLowercase,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString
} from "class-validator";
import { CardRarity } from "src/core/card/api/card.rarity.enum";
import { LegalityDto } from "src/core/card/api/legality.dto";

export class CreateCardDto {

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
    readonly legalities?: LegalityDto[];

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

    @IsString()
    @IsNotEmpty()
    readonly uuid: string;
}

export class UpdateCardDto extends PartialType(CreateCardDto) {
    @IsInt()
    @IsPositive()
    id: number;
}