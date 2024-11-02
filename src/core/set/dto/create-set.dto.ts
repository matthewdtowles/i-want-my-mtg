import {
    IsDateString,
    IsEnum,
    IsInt,
    IsLowercase,
    IsOptional,
    IsPositive,
    IsString,
} from "class-validator";
import { SetType } from "./set-type.enum";

export class CreateSetDto {
    @IsInt()
    @IsPositive()
    readonly baseSize: number;

    @IsOptional()
    @IsString()
    readonly block?: string;

    @IsLowercase()
    @IsString()
    readonly code: string;

    @IsLowercase()
    @IsString()
    readonly keyruneCode: string;

    @IsString()
    readonly name: string;

    @IsOptional()
    @IsLowercase()
    @IsString()
    readonly parentCode?: string;

    @IsDateString()
    readonly releaseDate: string;

    @IsEnum(SetType)
    readonly type: string;

    @IsString()
    readonly url: string;
}
