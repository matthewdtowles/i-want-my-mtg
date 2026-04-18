import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { Format } from 'src/core/card/format.enum';

export class CreateDeckDto {
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    readonly name: string;

    @IsOptional()
    @IsEnum(Format)
    readonly format?: Format | null;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    readonly description?: string | null;
}

export class UpdateDeckDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    readonly name?: string;

    @IsOptional()
    @IsEnum(Format)
    readonly format?: Format | null;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    readonly description?: string | null;
}

export class SetDeckCardDto {
    @IsString()
    readonly cardId: string;

    @IsInt()
    @Min(0)
    readonly quantity: number;

    @IsOptional()
    @IsBoolean()
    readonly isSideboard?: boolean;
}
