import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
    IsLowercase,
    IsOptional,
    IsPositive,
    IsString
} from "class-validator";
import { CardRarity } from "../card-rarity.enum";
import { PartialType } from "@nestjs/mapped-types";

export class CardDto {
    readonly id: number;
    readonly imgSrc: string;
    readonly isReserved?: boolean;
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly originalText?: string;
    readonly rarity: string;
    readonly setCode: string;
    readonly url: string;
    readonly uuid: string;
}

export class CreateCardDto {
    @IsString()
    readonly imgSrc: string;

    @IsBoolean()
    readonly isReserved?: boolean;

    @IsOptional()
    @IsString()
    readonly manaCost?: string;

    @IsString()
    readonly name: string;

    @IsOptional()
    @IsArray()
    readonly notes?: string[];

    @IsString()
    readonly number: string;

    @IsOptional()
    @IsString()
    readonly originalText?: string;

    @IsEnum(CardRarity)
    readonly rarity: string;

    @IsLowercase()
    @IsString()
    readonly setCode: string;

    @IsString()
    readonly url: string;

    @IsString()
    readonly uuid: string;
}

export class UpdateCardDto extends PartialType(CreateCardDto) {
    @IsInt()
    @IsPositive()
    id: number;
}