import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TransactionUpdateRequestDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly quantity?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly pricePerUnit?: number;

    @IsOptional()
    @IsDateString()
    readonly date?: string;

    @IsOptional()
    @IsString()
    readonly source?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly fees?: number;

    @IsOptional()
    @IsString()
    readonly notes?: string;
}
