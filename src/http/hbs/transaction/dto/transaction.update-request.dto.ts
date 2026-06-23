import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TransactionUpdateRequestDto {
    @ApiPropertyOptional({ minimum: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    readonly quantity?: number;

    @ApiPropertyOptional({ minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly pricePerUnit?: number;

    @ApiPropertyOptional({ format: 'date', description: 'Date-only string (YYYY-MM-DD)' })
    @IsOptional()
    @IsDateString()
    readonly date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    readonly source?: string;

    @ApiPropertyOptional({ minimum: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly fees?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    readonly notes?: string;
}
