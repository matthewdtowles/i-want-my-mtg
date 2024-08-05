import { IsInt, IsPositive, IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { SetType } from '../set-type.enum';

export class UpdateSetDto {
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