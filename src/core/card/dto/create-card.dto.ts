import { IsArray, IsBoolean, IsEnum, IsLowercase, IsOptional, IsString } from 'class-validator';
import { CardRarity } from '../card-rarity.enum';

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
