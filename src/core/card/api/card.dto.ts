import { PartialType } from "@nestjs/mapped-types";
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsLowercase,
    IsOptional,
    IsPositive,
    IsString
} from "class-validator";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { SetDto } from "src/core/set/api/set.dto";

export enum CardRarity {
    Common = "common",
    Uncommon = "uncommon",
    Rare = "rare",
    Mythic = "mythic",
    Bonus = "bonus",
    Special = "special",
}

export enum CardImgType {
    SMALL = "small",
    NORMAL = "normal",
    LARGE = "large",
    ART_CROP = "art_crop",
}

export class CardDto {
    readonly id: number;
    readonly artist: string;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    readonly legalities?: LegalityDto[];
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly rarity: string;
    readonly set?: SetDto;
    readonly setCode: string;
    readonly type: string;
    readonly url: string;
    readonly uuid: string;
}

export class CreateCardDto {

    @IsString()
    readonly artist: string;

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

    @IsString()
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