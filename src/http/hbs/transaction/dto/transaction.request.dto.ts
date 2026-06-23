import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class TransactionRequestDto {
    @ApiProperty()
    @IsString()
    readonly cardId: string;

    @ApiProperty({ enum: ['BUY', 'SELL'] })
    @IsIn(['BUY', 'SELL'])
    readonly type: 'BUY' | 'SELL';

    @ApiProperty({ minimum: 1 })
    @IsInt()
    @Min(1)
    readonly quantity: number;

    @ApiProperty({ minimum: 0 })
    @IsNumber()
    @Min(0)
    readonly pricePerUnit: number;

    @ApiProperty()
    @IsBoolean()
    readonly isFoil: boolean;

    @ApiProperty({ format: 'date-time', description: 'ISO 8601 date string' })
    @IsDateString()
    readonly date: string;

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

    @ApiPropertyOptional({ description: "Don't auto-adjust inventory from this transaction" })
    @IsOptional()
    @IsBoolean()
    readonly skipInventorySync?: boolean;
}
