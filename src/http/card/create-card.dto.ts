import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CardRarity } from './card-rarity.enum';

export class CreateCardDto {

    @IsString()
    imgSrc: string;

    @IsBoolean()
    isReserved?: boolean;

    @IsOptional()
    @IsString()
    manaCost?: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsArray()
    notes?: string[];

    @IsString()
    number: string;

    @IsOptional()
    @IsString()
    originalText?: string;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsEnum(CardRarity)
    rarity: string;

    @IsString()
    setCode: string;

    @IsOptional()
    @IsInt()
    totalOwned: number;

    @IsString()
    url: string;

    @IsString()
    uuid: string;
}
