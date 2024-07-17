import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString } from "class-validator";
import { SetType } from "../set-type.enum";

export class CreateSetDto {

    @IsInt()
    @IsPositive()
    baseSize: number;
    
    @IsOptional()
    @IsString()
    block?: string;

    @IsString()
    code: string;

    @IsOptional()
    @IsString()
    imgSrc?: string;

    @IsString()
    keyruneCode: string;
    
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    parentCode?: string;

    @IsDateString()
    releaseDate: string;
    
    @IsEnum(SetType)
    type: string;

    @IsString()
    url: string;
}