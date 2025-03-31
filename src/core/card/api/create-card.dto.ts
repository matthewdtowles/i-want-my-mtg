import { PartialType } from "@nestjs/mapped-types";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsLowercase,
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

    @IsString()
    readonly imgSrc: string;

    @IsBoolean()
    readonly isReserved: boolean;

    @IsOptional()
    readonly legalities?: LegalityDto[];

    @IsOptional()
    @IsString()
    readonly manaCost?: string;

    @IsString()
    readonly name: string;

    @IsNumber()
    readonly number: string;

    @IsOptional()
    @IsString()
    readonly oracleText?: string;

    @IsEnum(CardRarity)
    readonly rarity: string;

    @IsLowercase()
    @IsString()
    readonly setCode: string;

    @IsString()
    readonly type: string;

    @IsString()
    readonly uuid: string;
}

export class UpdateCardDto extends PartialType(CreateCardDto) {
    @IsInt()
    @IsPositive()
    id: number;
}