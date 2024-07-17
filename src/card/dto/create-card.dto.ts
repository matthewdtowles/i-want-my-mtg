import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString } from "class-validator";

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

    @IsString()
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
