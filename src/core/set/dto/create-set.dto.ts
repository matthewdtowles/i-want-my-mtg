import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { SetType } from './set-type.enum';

export class CreateSetDto {

    @IsInt()
    @IsPositive()
    readonly baseSize: number;
    
    @IsOptional()
    @IsString()
    readonly block?: string;

    @IsString()
    readonly code: string;

    @IsOptional()
    @IsString()
    readonly imgSrc?: string;

    @IsString()
    readonly keyruneCode: string;
    
    @IsString()
    readonly name: string;

    @IsOptional()
    @IsString()
    readonly parentCode?: string;

    @IsDateString()
    readonly releaseDate: string;
    
    @IsEnum(SetType)
    readonly type: string;

    @IsString()
    readonly url: string;
}