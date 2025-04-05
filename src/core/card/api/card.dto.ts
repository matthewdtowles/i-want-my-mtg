import { IsArray, IsBoolean, IsEnum, IsInstance, IsInt, IsLowercase, IsNumberString, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";
import { CardRarity } from "src/core/card/api/card.rarity.enum";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { SetDto } from "src/core/set/api/set.dto";

export class CardDto {

    @IsPositive()
    @IsInt()
    readonly id: number;

    @IsOptional()
    @IsString()
    readonly artist?: string;

    @IsString()
    readonly imgSrc: string;

    @IsBoolean()
    readonly isReserved: boolean;

    @IsOptional()
    @IsArray()
    @IsEnum(LegalityDto, { each: true })
    readonly legalities?: LegalityDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    readonly manaCost?: string[];

    @IsString()
    readonly name: string;

    @IsNumberString()
    readonly number: string;

    @IsOptional()
    @IsString()
    readonly oracleText?: string;

    @IsEnum(CardRarity)
    readonly rarity: CardRarity;

    @IsOptional()
    @IsInstance(SetDto)
    readonly set?: SetDto;

    @IsLowercase()
    @IsString()
    readonly setCode: string;

    @IsString()
    readonly type: string;

    @IsString()
    readonly url: string;

    @IsUUID()
    readonly uuid: string;
}